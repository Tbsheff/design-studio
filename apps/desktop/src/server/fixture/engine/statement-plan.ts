import { toNodes, toPatternNames, toReferencedNames } from "./ast-walk.js";
import type { Node, Statement, VariableDeclaration } from "./deps.js";
import { toParamKind } from "./page-shape.js";
import type { ParamReader } from "./page-shape.js";

interface PlanInput {
  readonly code: string;
  readonly reader: ParamReader;
  readonly serverNames: ReadonlySet<string>;
  readonly statements: readonly Statement[];
}

interface PlannedRemoval {
  readonly label: string;
  readonly statement: Statement;
}

interface StatementPlan {
  readonly kept: readonly Statement[];
  readonly removals: readonly PlannedRemoval[];
  readonly unresolved: readonly string[];
}

const WRAPPER_NAMES: ReadonlySet<string> = new Set([
  "HydrateClient",
  "HydrationBoundary",
]);

const PREFETCH_NAME = /^(?:batchPrefetch|prefetch)/u;

const GUARD_NAMES: ReadonlySet<string> = new Set([
  "notFound",
  "permanentRedirect",
  "redirect",
]);

const toCalleeName = (callee: Node): string | null => {
  if (callee.type === "Identifier") {
    return callee.name;
  }

  if (
    callee.type === "MemberExpression" &&
    !callee.computed &&
    callee.property.type === "Identifier"
  ) {
    return callee.property.name;
  }

  return null;
};

const toCalleeText = (code: string, callee: Node): string =>
  code.slice(callee.start ?? 0, callee.end ?? 0);

const toExpressionLabel = (
  code: string,
  statement: Statement
): string | null => {
  if (statement.type !== "ExpressionStatement") {
    return null;
  }

  let expression: Node = statement.expression;
  let prefix = "";

  if (expression.type === "UnaryExpression" && expression.operator === "void") {
    prefix = "void ";
    expression = expression.argument;
  }

  if (expression.type === "AwaitExpression") {
    prefix = `${prefix}await `;
    expression = expression.argument;
  }

  if (expression.type !== "CallExpression") {
    return null;
  }

  const name = toCalleeName(expression.callee);
  const text = toCalleeText(code, expression.callee);

  if (name !== null && PREFETCH_NAME.test(name)) {
    return `${prefix}${text}(...)`;
  }

  if (prefix.includes("await")) {
    return `${prefix}${text}(...)`;
  }

  if (name !== null && GUARD_NAMES.has(name)) {
    return `${text}(...)`;
  }

  return null;
};

const toGuardLabel = (code: string, statement: Statement): string | null => {
  if (statement.type !== "IfStatement") {
    return null;
  }

  const found = toNodes(statement.consequent, "CallExpression").find((call) => {
    if (call.type !== "CallExpression") {
      return false;
    }

    const name = toCalleeName(call.callee);

    return name !== null && GUARD_NAMES.has(name);
  });

  if (found?.type !== "CallExpression") {
    return null;
  }

  return `if (...) ${toCalleeText(code, found.callee)}(...)`;
};

const toDeclaredNames = (declaration: VariableDeclaration): readonly string[] =>
  declaration.declarations.flatMap((declarator) =>
    toPatternNames(declarator.id)
  );

const toInits = (declaration: VariableDeclaration): readonly Node[] =>
  declaration.declarations.flatMap((declarator) => {
    if (declarator.init) {
      return [declarator.init];
    }

    return [];
  });

const toServerAwaitLabels = (
  code: string,
  reader: ParamReader,
  nodes: readonly Node[]
): readonly string[] =>
  nodes.flatMap((root) =>
    toNodes(root, "AwaitExpression").flatMap((item) => {
      if (item.type !== "AwaitExpression") {
        return [];
      }

      if (toParamKind(reader, item.argument) !== null) {
        return [];
      }

      if (item.argument.type === "CallExpression") {
        return [`await ${toCalleeText(code, item.argument.callee)}(...)`];
      }

      return ["await (...)"];
    })
  );

const toSkipParamAwait =
  (reader: ParamReader) =>
  (node: Node): boolean =>
    node.type === "AwaitExpression" &&
    toParamKind(reader, node.argument) !== null;

const isTaintedInit = (
  input: PlanInput,
  tainted: ReadonlySet<string>,
  init: Node
): boolean => {
  const hasAwait =
    toServerAwaitLabels(input.code, input.reader, [init]).length > 0;

  const refs = toReferencedNames([init], toSkipParamAwait(input.reader));

  return hasAwait || [...refs].some((name) => tainted.has(name));
};

const toTaintedNames = (input: PlanInput): ReadonlySet<string> => {
  const tainted = new Set<string>(input.serverNames);

  const declarators = input.statements.flatMap((statement) => {
    if (statement.type === "VariableDeclaration") {
      return statement.declarations;
    }

    return [];
  });

  for (const declarator of declarators) {
    const init = declarator.init ?? null;

    if (init !== null && isTaintedInit(input, tainted, init)) {
      for (const name of toPatternNames(declarator.id)) {
        tainted.add(name);
      }
    }
  }

  return tainted;
};

const toStatementRefs = (
  statement: Statement,
  isSkipped: (node: Node) => boolean
): ReadonlySet<string> => {
  if (statement.type === "VariableDeclaration") {
    return toReferencedNames(toInits(statement), isSkipped);
  }

  return toReferencedNames([statement], isSkipped);
};

const isUsedElsewhere = (
  kept: readonly Statement[],
  statement: VariableDeclaration,
  isSkipped: (node: Node) => boolean
): boolean => {
  const names = toDeclaredNames(statement);

  return kept.some(
    (other) =>
      other !== statement &&
      names.some((name) => toStatementRefs(other, isSkipped).has(name))
  );
};

const toDeadDeclaration = (
  kept: readonly Statement[],
  isSkipped: (node: Node) => boolean
): VariableDeclaration | null => {
  const dead = kept.find(
    (statement) =>
      statement.type === "VariableDeclaration" &&
      !isUsedElsewhere(kept, statement, isSkipped)
  );

  if (dead?.type === "VariableDeclaration") {
    return dead;
  }

  return null;
};

const toRemovals = (input: PlanInput): readonly PlannedRemoval[] => {
  const removals: PlannedRemoval[] = [];

  for (const statement of input.statements) {
    const label =
      toExpressionLabel(input.code, statement) ??
      toGuardLabel(input.code, statement);

    if (label !== null) {
      removals.push({ label, statement });
    }
  }

  return removals;
};

const toStatementPlan = (input: PlanInput): StatementPlan => {
  const isSkipped = toSkipParamAwait(input.reader);
  const removals: PlannedRemoval[] = [...toRemovals(input)];

  let kept = input.statements.filter(
    (statement) => !removals.some((removal) => removal.statement === statement)
  );

  let dead = toDeadDeclaration(kept, isSkipped);

  while (dead !== null) {
    const target = dead;
    removals.push({
      label: `const ${toDeclaredNames(target).join(", ")}`,
      statement: target,
    });
    kept = kept.filter((statement) => statement !== target);
    dead = toDeadDeclaration(kept, isSkipped);
  }

  const tainted = toTaintedNames(input);

  const refs = new Set(
    kept.flatMap((statement) => [...toStatementRefs(statement, isSkipped)])
  );

  const unresolved = [
    ...[...refs].filter(
      (name) => tainted.has(name) && !WRAPPER_NAMES.has(name)
    ),
    ...toServerAwaitLabels(input.code, input.reader, kept),
  ];

  return { kept, removals, unresolved: [...new Set(unresolved)] };
};

export { toCalleeText, toStatementPlan, WRAPPER_NAMES };

export type { PlannedRemoval, StatementPlan };
