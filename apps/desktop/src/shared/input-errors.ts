import { SchemaAST, SchemaIssue } from "effect";
import type { Schema } from "effect";

const MAX_ISSUES = 3;
const MAX_DEPTH = 1;

const MISSING_MESSAGE = "Missing key";
const UNEXPECTED_PREFIX = "Unexpected key";

const formatIssues = SchemaIssue.makeFormatterStandardSchemaV1();

const toEncodedAst = (schema: Schema.Top): SchemaAST.AST =>
  SchemaAST.toEncoded(schema.ast);

const isObjectAst = (ast: SchemaAST.AST): ast is SchemaAST.Objects =>
  ast._tag === "Objects";

const isArrayAst = (ast: SchemaAST.AST): ast is SchemaAST.Arrays =>
  ast._tag === "Arrays";

const isUnionAst = (ast: SchemaAST.AST): ast is SchemaAST.Union =>
  ast._tag === "Union";

const isLiteralAst = (ast: SchemaAST.AST): ast is SchemaAST.Literal =>
  ast._tag === "Literal";

const isEnumAst = (ast: SchemaAST.AST): ast is SchemaAST.Enum =>
  ast._tag === "Enum";

const toTypeName = (ast: SchemaAST.AST): string => ast._tag.toLowerCase();

const describeObject = (ast: SchemaAST.Objects, depth: number): string => {
  if (depth > MAX_DEPTH) {
    return "object";
  }

  const fields = ast.propertySignatures.map((field) => {
    const mark = SchemaAST.isOptional(field.type) ? "?" : "";

    return `"${String(field.name)}"${mark}: ${describeAst(field.type, depth + 1)}`;
  });

  return `{${fields.join(", ")}}`;
};

const describeAst = (ast: SchemaAST.AST, depth: number): string => {
  if (isObjectAst(ast)) {
    return describeObject(ast, depth);
  }

  const [item] = isArrayAst(ast) ? ast.rest : [];

  if (item) {
    return `[${describeAst(item, depth + 1)}, ...]`;
  }

  if (isEnumAst(ast)) {
    return ast.enums.map(([, value]) => JSON.stringify(value)).join(" | ");
  }

  if (isLiteralAst(ast)) {
    return JSON.stringify(ast.literal);
  }

  if (isUnionAst(ast)) {
    return ast.types.map((type) => describeAst(type, depth + 1)).join(" | ");
  }

  return toTypeName(ast);
};

const toChildAst = (
  ast: SchemaAST.AST,
  key: PropertyKey
): SchemaAST.AST | null => {
  if (isObjectAst(ast)) {
    const field = ast.propertySignatures.find((item) => item.name === key);

    return field?.type ?? null;
  }

  if (isArrayAst(ast)) {
    return ast.rest[0] ?? ast.elements[Number(key)] ?? null;
  }

  if (isUnionAst(ast)) {
    const found = ast.types
      .map((type) => toChildAst(type, key))
      .find((child) => child !== null);

    return found ?? null;
  }

  return null;
};

const toAstAt = (
  schema: Schema.Top,
  path: readonly PropertyKey[]
): SchemaAST.AST | null => {
  let current: SchemaAST.AST | null = toEncodedAst(schema);

  for (const key of path) {
    if (current === null) {
      return null;
    }

    current = toChildAst(current, key);
  }

  return current;
};

const toObjectAst = (ast: SchemaAST.AST | null): SchemaAST.Objects | null => {
  if (ast === null) {
    return null;
  }

  if (isObjectAst(ast)) {
    return ast;
  }

  if (isUnionAst(ast)) {
    return ast.types.find((type) => isObjectAst(type)) ?? null;
  }

  return null;
};

const toUnexpectedText = (
  schema: Schema.Top,
  path: readonly PropertyKey[]
): string | null => {
  const parent = toObjectAst(toAstAt(schema, path.slice(0, -1)));

  if (parent === null || path.length > 1) {
    return null;
  }

  const names = parent.propertySignatures.map((field) => String(field.name));

  return `${path.map(String).join(".")} is not allowed. Allowed keys: ${names.join(", ")}`;
};

const toIssueText = (
  schema: Schema.Top,
  issue: { readonly message: string; readonly path?: readonly unknown[] | null }
): string => {
  const path = (issue.path ?? []) as readonly PropertyKey[];

  const field = path.map(String).join(".") || "input";

  if (issue.message.startsWith(UNEXPECTED_PREFIX)) {
    return toUnexpectedText(schema, path) ?? `${field}: ${issue.message}`;
  }

  const node = toAstAt(schema, path);
  const shape = node === null ? null : describeAst(node, 0);
  const expected = shape === null ? "" : `. Expected ${field} as ${shape}`;

  if (issue.message === MISSING_MESSAGE) {
    const parent = toAstAt(schema, path.slice(0, -1));
    const own = toObjectAst(parent)?.propertySignatures.find(
      (item) => String(item.name) === field.split(".").at(-1)
    );
    const hint = own ? `, as ${describeAst(own.type, 0)}` : "";

    return `${field} is required${hint}`;
  }

  return `${field}: ${issue.message}${expected}`;
};

const toInputIssues = (
  schema: Schema.Top,
  error: Schema.SchemaError
): string => {
  const issues = formatIssues(error.issue).issues;
  const shown = issues
    .slice(0, MAX_ISSUES)
    .map((issue) => toIssueText(schema, issue));
  const more = issues.length - shown.length;
  const tail = more > 0 ? `; and ${more} more` : "";

  return `${shown.join("; ")}${tail}`;
};

export { toInputIssues as inputIssues };
