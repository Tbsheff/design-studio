import type {
  ArrowFunctionExpression,
  FunctionExpression,
  JSXMemberExpression,
  JSXOpeningElement,
  Node,
} from "@babel/types";

interface SnippetScan {
  readonly components: readonly string[];
  readonly free: readonly string[];
  readonly isClient: boolean;
}

interface Found {
  readonly components: Set<string>;
  readonly free: Set<string>;
  hasHandler: boolean;
}

const GLOBALS: ReadonlySet<string> = new Set([
  "Array",
  "Boolean",
  "Date",
  "Infinity",
  "JSON",
  "Math",
  "NaN",
  "Number",
  "Object",
  "String",
  "document",
  "undefined",
  "window",
]);

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

const HOOK_NAME = /^use[A-Z]/u;

const HANDLER_NAME = /^on[A-Z]/u;

const COMPONENT_NAME = /^[A-Z]/u;

const isNode = (value: unknown): value is Node =>
  value instanceof Object && "type" in value;

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

const toDeclaredNames = (body: Node): readonly string[] => {
  if (body.type !== "BlockStatement") {
    return [];
  }

  return body.body.flatMap((statement) => {
    if (statement.type !== "VariableDeclaration") {
      return [];
    }

    return statement.declarations.flatMap((declarator) =>
      toPatternNames(declarator.id)
    );
  });
};

const toMemberRoot = (name: JSXMemberExpression): string => {
  if (name.object.type === "JSXMemberExpression") {
    return toMemberRoot(name.object);
  }

  return name.object.name;
};

const toRootName = (name: JSXOpeningElement["name"]): string | null => {
  if (name.type === "JSXIdentifier") {
    return name.name;
  }

  if (name.type === "JSXMemberExpression") {
    return toMemberRoot(name);
  }

  return null;
};

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

const isPropertyName = (node: Node, parent: Node | null): boolean => {
  if (parent === null) {
    return false;
  }

  if (
    parent.type === "MemberExpression" ||
    parent.type === "OptionalMemberExpression"
  ) {
    return parent.property === node && !parent.computed;
  }

  if (parent.type === "ObjectProperty" || parent.type === "ObjectMethod") {
    return parent.key === node && !parent.computed;
  }

  return false;
};

type Visit = (
  node: Node,
  parent: Node | null,
  bound: ReadonlySet<string>,
  found: Found
) => void;

const setOpening = (
  node: JSXOpeningElement,
  bound: ReadonlySet<string>,
  found: Found,
  runVisit: Visit
): void => {
  const root = toRootName(node.name);

  if (root !== null && COMPONENT_NAME.test(root)) {
    found.components.add(root);
    found.free.add(root);
  }

  for (const attribute of node.attributes) {
    if (attribute.type === "JSXSpreadAttribute") {
      runVisit(attribute.argument, attribute, bound, found);
    } else {
      if (
        attribute.name.type === "JSXIdentifier" &&
        HANDLER_NAME.test(attribute.name.name)
      ) {
        found.hasHandler = true;
      }

      if (attribute.value) {
        runVisit(attribute.value, attribute, bound, found);
      }
    }
  }
};

const setFunction = (
  node: ArrowFunctionExpression | FunctionExpression,
  bound: ReadonlySet<string>,
  found: Found,
  runVisit: Visit
): void => {
  const inner = new Set([
    ...bound,
    ...node.params.flatMap((param) => toPatternNames(param)),
    ...toDeclaredNames(node.body),
  ]);

  runVisit(node.body, node, inner, found);
};

const runVisit: Visit = (node, parent, bound, found) => {
  if (node.type === "JSXClosingElement") {
    return;
  }

  if (node.type === "Identifier") {
    if (!bound.has(node.name) && !isPropertyName(node, parent)) {
      found.free.add(node.name);
    }
  } else if (node.type.startsWith("TS")) {
    if ("expression" in node && isNode(node.expression)) {
      runVisit(node.expression, node, bound, found);
    }
  } else if (node.type === "JSXOpeningElement") {
    setOpening(node, bound, found, runVisit);
  } else if (
    node.type === "ArrowFunctionExpression" ||
    node.type === "FunctionExpression"
  ) {
    setFunction(node, bound, found, runVisit);
  } else {
    for (const child of toChildren(node)) {
      runVisit(child, node, bound, found);
    }
  }
};

const inspectSnippet = (root: Node): SnippetScan => {
  const found: Found = {
    components: new Set<string>(),
    free: new Set<string>(),
    hasHandler: false,
  };

  runVisit(root, null, new Set<string>(), found);

  const names = [...found.free].filter((name) => !GLOBALS.has(name));

  return {
    components: [...found.components],
    free: names,
    isClient: found.hasHandler || names.some((name) => HOOK_NAME.test(name)),
  };
};

export { inspectSnippet };

export type { SnippetScan };
