import type { Node as BabelNode, JSXOpeningElement } from "@babel/types";

type NodeVisit = (node: BabelNode, parent: BabelNode | null) => boolean;

const SKIPPED_KEYS = new Set([
  "extra",
  "innerComments",
  "leadingComments",
  "loc",
  "trailingComments",
]);

const EXPRESSION_TYPE_WRAPPERS = new Set([
  "TSAsExpression",
  "TSNonNullExpression",
  "TSSatisfiesExpression",
  "TSTypeAssertion",
]);

const isNode = (value: unknown): value is BabelNode =>
  typeof value === "object" &&
  value !== null &&
  "type" in value &&
  typeof value.type === "string";

const toChildren = (node: BabelNode): BabelNode[] => {
  const out: BabelNode[] = [];

  for (const [key, value] of Object.entries(node)) {
    if (!SKIPPED_KEYS.has(key)) {
      const items: unknown[] = [value].flat();

      out.push(...items.filter((item): item is BabelNode => isNode(item)));
    }
  }

  return out;
};

const runWalk = (
  node: BabelNode,
  parent: BabelNode | null,
  visit: NodeVisit
): void => {
  if (!visit(node, parent)) {
    return;
  }

  for (const child of toChildren(node)) {
    runWalk(child, node, visit);
  }
};

const listNodes = <Item>(
  root: BabelNode,
  pick: (node: BabelNode, parent: BabelNode | null) => Item | null
): Item[] => {
  const out: Item[] = [];

  runWalk(root, null, (node, parent) => {
    const item = pick(node, parent);

    if (item !== null) {
      out.push(item);
    }

    return true;
  });

  return out;
};

const isTypeNode = (node: BabelNode): boolean =>
  node.type.startsWith("TS") && !EXPRESSION_TYPE_WRAPPERS.has(node.type);

const toStart = (node: BabelNode): number => node.start ?? 0;

const toEnd = (node: BabelNode): number => node.end ?? 0;

const toTagName = (name: JSXOpeningElement["name"]): string => {
  if (name.type === "JSXIdentifier") {
    return name.name;
  }

  if (name.type === "JSXMemberExpression") {
    return `${toTagName(name.object)}.${name.property.name}`;
  }

  return `${name.namespace.name}:${name.name.name}`;
};

const BACKSLASH = "\\";

const LEADING_SPACE = /^[ \t]*/u;

const FIRST_INDENT = /\n(?<indent>[ \t]+)\S/u;

const FROM_QUOTE = /\bfrom\s+(?<quote>["'])/u;

const toLineIndent = (code: string, at: number): string => {
  const lineStart = code.lastIndexOf("\n", at - 1) + 1;

  return LEADING_SPACE.exec(code.slice(lineStart, at))?.[0] ?? "";
};

const toUnit = (code: string): string =>
  FIRST_INDENT.exec(code)?.groups?.indent ?? "  ";

const toQuote = (code: string): string =>
  FROM_QUOTE.exec(code)?.groups?.quote ?? '"';

const toLiteral = (code: string, text: string): string => {
  const quote = toQuote(code);

  const escaped = text
    .replaceAll(BACKSLASH, `${BACKSLASH}${BACKSLASH}`)
    .replaceAll(quote, `${BACKSLASH}${quote}`)
    .replaceAll("\n", `${BACKSLASH}n`);

  return `${quote}${escaped}${quote}`;
};

export {
  listNodes,
  toEnd,
  isNode,
  isTypeNode,
  toStart,
  toChildren,
  toLineIndent,
  toLiteral,
  toTagName,
  toUnit,
  runWalk,
};

export type { NodeVisit };
