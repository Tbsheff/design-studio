import type {
  File as BabelFile,
  Node as BabelNode,
  Identifier,
  ObjectPattern,
  ObjectProperty,
  RestElement,
  Statement,
  TSType,
  TSTypeParameterInstantiation,
  VariableDeclaration,
} from "@babel/types";

import { listNodes, toEnd } from "./ast.js";
import { EMPTY_HOST, toLocalTypes, toTypeHost } from "./type-host.js";
import type { HostContext } from "./type-host.js";
import { toPlanned, toRefusal } from "./types.js";
import type {
  ComponentModel,
  FunctionNode,
  Outcome,
  PropEntry,
  TypeHost,
} from "./types.js";

interface FoundFunction {
  readonly declaredType: TSType | null;
  readonly fn: FunctionNode;
  readonly typeArgs: TSTypeParameterInstantiation | null;
}

const FUNCTION_TYPES = new Set([
  "ArrowFunctionExpression",
  "FunctionDeclaration",
  "FunctionExpression",
]);

const COMPONENT_TYPE_NAME = /(?:^|\.)(?:FC|FunctionComponent|VFC)$/u;

const isFunctionNode = (node: BabelNode | null): node is FunctionNode =>
  node !== null && FUNCTION_TYPES.has(node.type);

const toUnwrapped = (
  node: BabelNode | null
): {
  fn: FunctionNode;
  typeArgs: TSTypeParameterInstantiation | null;
} | null => {
  if (isFunctionNode(node)) {
    return { fn: node, typeArgs: null };
  }

  if (node?.type !== "CallExpression") {
    return null;
  }

  const inner = toUnwrapped(node.arguments[0] ?? null);

  if (inner === null) {
    return null;
  }

  const own = node.typeParameters;

  if (own?.type === "TSTypeParameterInstantiation") {
    return { fn: inner.fn, typeArgs: inner.typeArgs ?? own };
  }

  return inner;
};

const toDeclaredType = (id: Identifier): TSType | null => {
  const annotation = id.typeAnnotation;

  if (annotation?.type !== "TSTypeAnnotation") {
    return null;
  }

  const type = annotation.typeAnnotation;

  if (
    type.type === "TSTypeReference" &&
    type.typeName.type === "Identifier" &&
    COMPONENT_TYPE_NAME.test(type.typeName.name)
  ) {
    return type.typeParameters?.params[0] ?? null;
  }

  return null;
};

const toStatementTarget = (statement: Statement): BabelNode | null => {
  if (
    statement.type === "ExportNamedDeclaration" ||
    statement.type === "ExportDefaultDeclaration"
  ) {
    return statement.declaration ?? null;
  }

  return statement;
};

const fromDeclarations = (
  target: VariableDeclaration,
  name: string
): FoundFunction | null => {
  for (const declarator of target.declarations) {
    if (declarator.id.type === "Identifier" && declarator.id.name === name) {
      const found = toUnwrapped(declarator.init ?? null);

      if (found !== null) {
        return { ...found, declaredType: toDeclaredType(declarator.id) };
      }
    }
  }

  return null;
};

const getFunction = (ast: BabelFile, name: string): FoundFunction | null => {
  for (const statement of ast.program.body) {
    const target = toStatementTarget(statement);

    if (target?.type === "FunctionDeclaration" && target.id?.name === name) {
      return { declaredType: null, fn: target, typeArgs: null };
    }

    if (target?.type === "VariableDeclaration") {
      const found = fromDeclarations(target, name);

      if (found !== null) {
        return found;
      }
    }
  }

  return null;
};

const toKeyName = (property: ObjectProperty): string | null => {
  if (property.computed) {
    return null;
  }

  if (property.key.type === "Identifier") {
    return property.key.name;
  }

  if (property.key.type === "StringLiteral") {
    return property.key.value;
  }

  return null;
};

const toEntry = (property: ObjectProperty): PropEntry | null => {
  const name = toKeyName(property);

  if (name === null) {
    return null;
  }

  const { value } = property;

  if (value.type === "Identifier") {
    return {
      defaultNode: null,
      isShorthand: property.shorthand,
      local: value.name,
      name,
      property,
    };
  }

  if (value.type === "AssignmentPattern" && value.left.type === "Identifier") {
    return {
      defaultNode: value.right,
      isShorthand: property.shorthand,
      local: value.left.name,
      name,
      property,
    };
  }

  return { defaultNode: null, isShorthand: false, local: null, name, property };
};

const toAnnotationNode = (
  pattern: ObjectPattern,
  found: FoundFunction
): TSType | null => {
  const own = pattern.typeAnnotation;

  if (own?.type === "TSTypeAnnotation") {
    return own.typeAnnotation;
  }

  const args = found.typeArgs?.params ?? [];

  if (args.length >= 2) {
    return args[1] ?? null;
  }

  return found.declaredType;
};

const toHost = (
  context: HostContext,
  pattern: ObjectPattern,
  found: FoundFunction,
  isTyped: boolean
): TypeHost => {
  const annotation = toAnnotationNode(pattern, found);

  if (annotation !== null) {
    return toTypeHost(context, annotation, 0);
  }

  if (!isTyped) {
    return EMPTY_HOST;
  }

  return { ...EMPTY_HOST, annotationAt: toEnd(pattern) };
};

const toPattern = (fn: FunctionNode): ObjectPattern | null => {
  const [param] = fn.params;

  if (param?.type === "ObjectPattern") {
    return param;
  }

  if (
    param?.type === "AssignmentPattern" &&
    param.left.type === "ObjectPattern"
  ) {
    return param.left;
  }

  return null;
};

const getComponentModel = (
  code: string,
  ast: BabelFile,
  name: string,
  file: string
): Outcome<ComponentModel> => {
  const found = getFunction(ast, name);

  if (found === null) {
    return toRefusal("not_found", `${file} has no component named ${name}.`);
  }

  const pattern = toPattern(found.fn);

  if (pattern === null) {
    return toRefusal(
      "bad_request",
      `${name} does not destructure its props in the parameter list, so its props cannot be edited safely. Destructure them first: ({ a, b }: Props).`
    );
  }

  const properties = pattern.properties.filter(
    (item): item is ObjectProperty => item.type === "ObjectProperty"
  );

  const rest =
    pattern.properties.find(
      (item): item is RestElement => item.type === "RestElement"
    ) ?? null;

  const isTyped = /\.(?:tsx|ts)$/u.test(file);
  const context: HostContext = { code, locals: toLocalTypes(ast) };

  const entries = properties.flatMap((item) => toEntry(item) ?? []);
  const { fn } = found;
  const host = toHost(context, pattern, found, isTyped);

  return toPlanned({
    ast,
    code,
    entries,
    fn,
    host,
    isTyped,
    name,
    pattern,
    rest,
  });
};

const toIdentifierNames = (node: BabelNode): string[] =>
  listNodes(node, (item) => {
    if (item.type === "Identifier") {
      return item.name;
    }

    return null;
  });

const toBindingRoots = (node: BabelNode): BabelNode[] => {
  if (node.type === "VariableDeclarator") {
    return [node.id];
  }

  if (node.type === "ArrowFunctionExpression") {
    return [...node.params];
  }

  if (
    node.type === "FunctionDeclaration" ||
    node.type === "FunctionExpression"
  ) {
    const roots: BabelNode[] = [...node.params];

    if (node.id) {
      roots.push(node.id);
    }

    return roots;
  }

  return [];
};

interface SkipRange {
  readonly end: number;
  readonly start: number;
}

const isKept = (node: BabelNode, skip: SkipRange | null): boolean => {
  const at = node.start ?? 0;

  return skip === null || at < skip.start || at >= skip.end;
};

const toRootNames = (node: BabelNode): string[] =>
  toBindingRoots(node).flatMap((root) => toIdentifierNames(root));

const toBodyBindings = (
  model: ComponentModel,
  skip: SkipRange | null
): Set<string> => {
  const roots = listNodes(model.fn.body, (node) => {
    if (toBindingRoots(node).length > 0) {
      return node;
    }

    return null;
  });

  const kept = roots.filter((node) => isKept(node, skip));

  return new Set(kept.flatMap((node) => toRootNames(node)));
};

export { getComponentModel, toBodyBindings, toIdentifierNames };
