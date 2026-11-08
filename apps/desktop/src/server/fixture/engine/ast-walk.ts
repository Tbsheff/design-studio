import type { Node } from "./deps.js";

type Visit = (node: Node, parent: Node | null) => boolean;

const SKIPPED_KEYS: ReadonlySet<string> = new Set([
  "end",
  "extra",
  "innerComments",
  "leadingComments",
  "loc",
  "start",
  "trailingComments",
  "type",
]);

const isNode = (value: unknown): value is Node =>
  value instanceof Object && "type" in value;

const toChildren = (node: Node): readonly Node[] =>
  Object.entries(node).flatMap(([key, value]) => {
    if (SKIPPED_KEYS.has(key)) {
      return [];
    }

    if (Array.isArray(value)) {
      return value.filter((item) => isNode(item));
    }

    if (isNode(value)) {
      return [value];
    }

    return [];
  });

const inspectNode = (node: Node, parent: Node | null, visit: Visit): void => {
  if (!visit(node, parent)) {
    return;
  }

  for (const child of toChildren(node)) {
    inspectNode(child, node, visit);
  }
};

const isDeclaredKey = (node: Node, parent: Node | null): boolean => {
  if (parent === null) {
    return false;
  }

  if (
    parent.type === "MemberExpression" ||
    parent.type === "OptionalMemberExpression"
  ) {
    return parent.property === node && !parent.computed;
  }

  if (
    parent.type === "ObjectProperty" ||
    parent.type === "ClassProperty" ||
    parent.type === "ObjectMethod"
  ) {
    return parent.key === node && !parent.computed;
  }

  if (parent.type === "JSXAttribute") {
    return true;
  }

  return false;
};

const toNodeName = (node: Node, parent: Node | null): string | null => {
  if (node.type === "Identifier" && !isDeclaredKey(node, parent)) {
    return node.name;
  }

  if (
    node.type === "JSXIdentifier" &&
    parent?.type !== "JSXAttribute" &&
    !(parent?.type === "JSXMemberExpression" && parent.property === node)
  ) {
    return node.name;
  }

  return null;
};

const toReferencedNames = (
  nodes: readonly Node[],
  isSkipped: (node: Node) => boolean
): ReadonlySet<string> => {
  const names = new Set<string>();

  for (const root of nodes) {
    inspectNode(root, null, (node, parent) => {
      if (isSkipped(node)) {
        return false;
      }

      const name = toNodeName(node, parent);

      if (name !== null) {
        names.add(name);
      }

      return true;
    });
  }

  return names;
};

const toPatternNames = (pattern: Node | null): readonly string[] => {
  if (pattern === null) {
    return [];
  }

  if (pattern.type === "Identifier") {
    return [pattern.name];
  }

  if (pattern.type === "AssignmentPattern") {
    return toPatternNames(pattern.left);
  }

  if (pattern.type === "RestElement") {
    return toPatternNames(pattern.argument);
  }

  if (pattern.type === "ArrayPattern") {
    return pattern.elements.flatMap((element) => toPatternNames(element));
  }

  if (pattern.type === "ObjectPattern") {
    return pattern.properties.flatMap((property) => {
      if (property.type === "RestElement") {
        return toPatternNames(property.argument);
      }

      return toPatternNames(property.value);
    });
  }

  return [];
};

const toNodes = (node: Node, type: Node["type"]): readonly Node[] => {
  const found: Node[] = [];

  inspectNode(node, null, (item) => {
    if (item.type === type) {
      found.push(item);
    }

    return true;
  });

  return found;
};

export { toNodes, toPatternNames, toReferencedNames, inspectNode };
