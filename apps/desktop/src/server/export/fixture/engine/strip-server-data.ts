import { toNodes, toPatternNames, toReferencedNames } from "./ast-walk.js";
import type { File, Node, Statement } from "./deps.js";
import { toUnwrapped } from "./jsx-unwrap.js";
import type { Splice } from "./jsx-unwrap.js";
import {
  toBodyStatements,
  toDefaultFunction,
  toParamKind,
  toParamReader,
  toServerImportNames,
} from "./page-shape.js";
import type { PageFunction, ParamReader } from "./page-shape.js";
import { toStatementPlan } from "./statement-plan.js";

interface StripCommand {
  readonly ast: File;
  readonly code: string;
  readonly params: Readonly<Record<string, string>>;
  readonly searchParams: Readonly<Record<string, string>>;
}

interface StripDone {
  readonly isOk: true;
  readonly removed: readonly string[];
  readonly source: string;
  readonly unresolved: readonly string[];
}

interface StripRefused {
  readonly isOk: false;
  readonly message: string;
  readonly unresolved: readonly string[];
}

type StripResult = StripDone | StripRefused;

const DROPPED_EXPORTS: ReadonlySet<string> = new Set([
  "generateMetadata",
  "generateStaticParams",
  "generateViewport",
]);

const toRefusal = (
  message: string,
  unresolved: readonly string[]
): StripRefused => ({
  isOk: false,
  message,
  unresolved,
});

const toRemovalSplice = (code: string, node: Node): Splice => {
  let start = node.start ?? 0;
  let end = node.end ?? 0;

  while (start > 0 && (code[start - 1] === " " || code[start - 1] === "\t")) {
    start -= 1;
  }

  while (end < code.length && (code[end] === " " || code[end] === "\t")) {
    end += 1;
  }

  if (code.startsWith("//", end)) {
    const lineEnd = code.indexOf("\n", end);

    end = lineEnd;

    if (lineEnd === -1) {
      end = code.length;
    }
  }

  if (code[end] === "\n") {
    end += 1;
  }

  if (start > 0 && code[start - 1] !== "\n") {
    start = node.start ?? 0;
  }

  return { end, start, text: "" };
};

const toLiteral = (record: Readonly<Record<string, string>>): string =>
  JSON.stringify(record);

const toParamSplices = (
  reader: ParamReader,
  roots: readonly Node[],
  command: StripCommand
): readonly Splice[] =>
  roots.flatMap((root) =>
    toNodes(root, "AwaitExpression").flatMap((item) => {
      if (item.type !== "AwaitExpression") {
        return [];
      }

      const kind = toParamKind(reader, item.argument);

      if (kind === null) {
        return [];
      }

      return [
        {
          end: item.end ?? 0,
          start: item.start ?? 0,
          text: toLiteral(command[kind]),
        },
      ];
    })
  );

const toDroppedExportNames = (statement: Statement): readonly string[] => {
  if (statement.type !== "ExportNamedDeclaration" || !statement.declaration) {
    return [];
  }

  const { declaration } = statement;

  if (declaration.type === "FunctionDeclaration" && declaration.id) {
    return [declaration.id.name];
  }

  if (declaration.type === "VariableDeclaration") {
    return declaration.declarations.flatMap((declarator) =>
      toPatternNames(declarator.id)
    );
  }

  return [];
};

interface ExportRemovals {
  readonly names: readonly string[];
  readonly splices: readonly Splice[];
}

const toExportRemovals = (command: StripCommand): ExportRemovals => {
  const names: string[] = [];
  const splices: Splice[] = [];

  for (const statement of command.ast.program.body) {
    const dropped = toDroppedExportNames(statement).filter((name) =>
      DROPPED_EXPORTS.has(name)
    );

    if (dropped.length > 0) {
      names.push(...dropped);
      splices.push(toRemovalSplice(command.code, statement));
    }
  }

  return { names, splices };
};

const toSource = (code: string, splices: readonly Splice[]): string => {
  const ordered = splices.toSorted((left, right) => right.start - left.start);
  let output = code;

  for (const splice of ordered) {
    output =
      output.slice(0, splice.start) + splice.text + output.slice(splice.end);
  }

  return output.replaceAll(/\n{3,}/gu, "\n\n");
};

const toSoftNames = (
  reader: ParamReader,
  kept: readonly Statement[]
): readonly string[] => {
  const used = toReferencedNames(
    kept,
    (node) =>
      node.type === "AwaitExpression" &&
      toParamKind(reader, node.argument) !== null
  );

  const names = [...reader.aliases.keys()];

  if (reader.propsName !== null) {
    names.push(reader.propsName);
  }

  return names.filter((name) => used.has(name));
};

const toStrippedFunction = (
  command: StripCommand,
  page: PageFunction
): StripResult => {
  const reader = toParamReader(page);

  const serverNames = toServerImportNames(command.ast);
  const statements = toBodyStatements(page);

  const plan = toStatementPlan({
    code: command.code,
    reader,
    serverNames,
    statements,
  });

  if (plan.unresolved.length > 0) {
    return toRefusal(
      `The page needs values that only the server has: ${plan.unresolved.join(", ")}. A fixture cannot keep them.`,
      plan.unresolved
    );
  }

  const roots: readonly Node[] = [...plan.kept];
  const unwrapped = toUnwrapped(roots);
  const exportsDropped = toExportRemovals(command);

  const splices = [
    ...plan.removals.map((removal) =>
      toRemovalSplice(command.code, removal.statement)
    ),
    ...exportsDropped.splices,
    ...unwrapped.splices,
    ...toParamSplices(reader, roots, command),
  ];

  const removed = [
    ...plan.removals.map((removal) => removal.label),
    ...unwrapped.names,
    ...exportsDropped.names,
  ];

  const source = toSource(command.code, splices);
  const unresolved = toSoftNames(reader, plan.kept);

  return { isOk: true, removed, source, unresolved };
};

const toStrippedPage = (command: StripCommand): StripResult => {
  const page = toDefaultFunction(command.ast);

  if (page === null) {
    return toRefusal(
      "The route has no default export function. A fixture needs a page that returns JSX.",
      []
    );
  }

  return toStrippedFunction(command, page);
};

export { toStrippedPage };

export type { StripCommand, StripDone, StripRefused, StripResult };
