import { toPatternNames } from "./ast-walk.js";
import type {
  ArrowFunctionExpression,
  File,
  FunctionDeclaration,
  FunctionExpression,
  Node,
  Program,
  Statement,
  VariableDeclaration,
} from "./deps.js";

type PageFunction =
  | ArrowFunctionExpression
  | FunctionDeclaration
  | FunctionExpression;

type ParamKind = "params" | "searchParams";

interface ParamReader {
  readonly aliases: ReadonlyMap<string, ParamKind>;
  readonly propsName: string | null;
}

const SERVER_SOURCE = /(?:^|\/)server$|server-only|^next\/(?:cache|headers)$/u;

const isPageFunction = (node: Node): node is PageFunction =>
  node.type === "ArrowFunctionExpression" ||
  node.type === "FunctionDeclaration" ||
  node.type === "FunctionExpression";

const toDeclaratorFunction = (
  declaration: VariableDeclaration,
  name: string
): PageFunction | null => {
  const found = declaration.declarations.find(
    (declarator) =>
      declarator.id.type === "Identifier" && declarator.id.name === name
  );

  const init = found?.init ?? null;

  if (init !== null && isPageFunction(init)) {
    return init;
  }

  return null;
};

const toStatementFunction = (
  statement: Statement,
  name: string
): PageFunction | null => {
  if (statement.type === "FunctionDeclaration" && statement.id?.name === name) {
    return statement;
  }

  if (statement.type === "VariableDeclaration") {
    return toDeclaratorFunction(statement, name);
  }

  return null;
};

const toNamedFunction = (program: Program, name: string): PageFunction | null =>
  program.body
    .map((statement) => toStatementFunction(statement, name))
    .find((found) => found !== null) ?? null;

const toExportFunction = (
  ast: File,
  statement: Statement
): PageFunction | null => {
  if (statement.type !== "ExportDefaultDeclaration") {
    return null;
  }

  const declaration: Node = statement.declaration;

  if (isPageFunction(declaration)) {
    return declaration;
  }

  if (declaration.type === "Identifier") {
    return toNamedFunction(ast.program, declaration.name);
  }

  return null;
};

const toDefaultFunction = (ast: File): PageFunction | null =>
  ast.program.body
    .map((statement) => toExportFunction(ast, statement))
    .find((found) => found !== null) ?? null;

const toKind = (name: string): ParamKind | null => {
  if (name === "params" || name === "searchParams") {
    return name;
  }

  return null;
};

const toAliasEntries = (
  pattern: Extract<Node, { type: "ObjectPattern" }>
): readonly (readonly [string, ParamKind])[] =>
  pattern.properties.flatMap((property) => {
    if (
      property.type !== "ObjectProperty" ||
      property.key.type !== "Identifier"
    ) {
      return [];
    }

    const kind = toKind(property.key.name);
    const alias = toPatternNames(property.value).at(0) ?? null;

    if (kind === null || alias === null) {
      return [];
    }

    return [[alias, kind] as const];
  });

const toParamReader = (page: PageFunction): ParamReader => {
  const [first] = page.params;

  if (first?.type === "Identifier") {
    return { aliases: new Map(), propsName: first.name };
  }

  if (first?.type === "ObjectPattern") {
    return { aliases: new Map(toAliasEntries(first)), propsName: null };
  }

  return { aliases: new Map(), propsName: null };
};

const isPropsMember = (reader: ParamReader, node: Node): boolean =>
  node.type === "MemberExpression" &&
  !node.computed &&
  node.object.type === "Identifier" &&
  node.object.name === reader.propsName;

const toParamKind = (reader: ParamReader, node: Node): ParamKind | null => {
  if (node.type === "Identifier") {
    return reader.aliases.get(node.name) ?? null;
  }

  if (
    node.type === "MemberExpression" &&
    isPropsMember(reader, node) &&
    node.property.type === "Identifier"
  ) {
    return toKind(node.property.name);
  }

  return null;
};

const toStatementServerNames = (statement: Statement): readonly string[] => {
  if (
    statement.type === "ImportDeclaration" &&
    statement.importKind !== "type" &&
    SERVER_SOURCE.test(statement.source.value)
  ) {
    return statement.specifiers.map((specifier) => specifier.local.name);
  }

  return [];
};

const toServerImportNames = (ast: File): ReadonlySet<string> =>
  new Set(
    ast.program.body.flatMap((statement) => toStatementServerNames(statement))
  );

const toBodyStatements = (page: PageFunction): readonly Statement[] => {
  if (page.body.type === "BlockStatement") {
    return page.body.body;
  }

  return [];
};

export {
  isPageFunction,
  toBodyStatements,
  toDefaultFunction,
  toParamKind,
  toParamReader,
  toServerImportNames,
};

export type { PageFunction, ParamKind, ParamReader };
