import type {
  JSXAttribute,
  JSXElement,
  JSXExpressionContainer,
  JSXFragment,
  JSXMemberExpression,
  JSXOpeningElement,
  JSXSpreadAttribute,
  Node,
  ObjectExpression,
} from "@babel/types";

interface ConvertOptions {
  readonly isHtml: boolean;
  readonly unmapped: ReadonlySet<string>;
}

interface ConvertResult {
  readonly dropped: readonly string[];
  readonly text: string;
}

interface Edit {
  readonly end: number;
  readonly start: number;
  readonly text: string;
}

interface Plan {
  readonly dropped: Set<string>;
  readonly edits: Edit[];
  readonly options: ConvertOptions;
  readonly source: string;
}

const WRAP_HEAD = 3;

const WRAP_TAIL = 4;

const LABEL_MAX = 40;

const FRAGMENT_OPEN = 2;

const FRAGMENT_CLOSE = 3;

const SELF_CLOSE = 2;

const VOID_TAGS: ReadonlySet<string> = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "source",
  "track",
  "wbr",
]);

const KEEP_ON_COMPONENT =
  /^(?:aria-[\w-]+|className|data-[\w-]+|id|key|role|title)$/u;

const IS_UNSAFE_NAME = /^(?:on[A-Z]\w*|style)$/u;

const COMPONENT_NAME = /^[A-Z]/u;

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

const toEdit = (start: number, end: number, text: string): Edit => ({
  end,
  start,
  text,
});

const toRange = (node: Node): readonly [number, number] => [
  node.start ?? 0,
  node.end ?? 0,
];

const toLabel = (source: string, node: Node): string => {
  const [start, end] = toRange(node);

  return source.slice(start, end).replaceAll(/\s+/gu, " ").slice(0, LABEL_MAX);
};

const toMemberRoot = (name: JSXMemberExpression): string => {
  if (name.object.type === "JSXMemberExpression") {
    return toMemberRoot(name.object);
  }

  return name.object.name;
};

const toRootName = (name: JSXOpeningElement["name"]): string => {
  if (name.type === "JSXIdentifier") {
    return name.name;
  }

  if (name.type === "JSXMemberExpression") {
    return toMemberRoot(name);
  }

  return "";
};

const toStringValue = (value: JSXAttribute["value"]): string | null => {
  if (!value) {
    return "";
  }

  if (value.type === "StringLiteral") {
    return value.value;
  }

  if (
    value.type === "JSXExpressionContainer" &&
    value.expression.type === "StringLiteral"
  ) {
    return value.expression.value;
  }

  return null;
};

const UNITLESS: ReadonlySet<string> = new Set([
  "flex",
  "flexGrow",
  "flexShrink",
  "fontWeight",
  "lineHeight",
  "opacity",
  "order",
  "zIndex",
]);

const toCssName = (name: string): string =>
  name.replaceAll(/[A-Z]/gu, (letter) => `-${letter.toLowerCase()}`);

const toCssValue = (name: string, value: Node): string | null => {
  if (value.type === "StringLiteral") {
    return value.value;
  }

  if (value.type !== "NumericLiteral") {
    return null;
  }

  if (value.value === 0 || UNITLESS.has(name)) {
    return String(value.value);
  }

  return `${value.value}px`;
};

const toKeyName = (key: Node): string => {
  if (key.type === "Identifier") {
    return key.name;
  }

  if (key.type === "StringLiteral") {
    return key.value;
  }

  return "";
};

const toCssDeclaration = (property: Node): string | null => {
  if (property.type !== "ObjectProperty" || property.computed) {
    return null;
  }

  const name = toKeyName(property.key);
  const value = toCssValue(name, property.value);

  if (name === "" || value === null) {
    return null;
  }

  return `${toCssName(name)}: ${value}`;
};

const toStyleText = (object: ObjectExpression | null): string | null => {
  if (object === null) {
    return null;
  }

  const declarations = object.properties.map((property) =>
    toCssDeclaration(property)
  );

  if (declarations.some((declaration) => declaration === null)) {
    return null;
  }

  return declarations.join("; ").replaceAll('"', "&quot;");
};

const toStyleExpression = (
  value: JSXAttribute["value"]
): ObjectExpression | null => {
  if (
    value?.type === "JSXExpressionContainer" &&
    value.expression.type === "ObjectExpression"
  ) {
    return value.expression;
  }

  return null;
};

const toRemoval = (source: string, node: Node): Edit => {
  const [start, end] = toRange(node);
  let from = start;

  while (from > 0 && /\s/u.test(source.charAt(from - 1))) {
    from -= 1;
  }

  return toEdit(from, end, "");
};

const toAttributeName = (attribute: JSXAttribute): string => {
  if (attribute.name.type === "JSXIdentifier") {
    return attribute.name.name;
  }

  return "";
};

const toDropLabel = (owner: string, name: string): string => {
  if (name === "") {
    return `<${owner}> prop`;
  }

  return `<${owner}> ${name}`;
};

const setAttribute = (
  plan: Plan,
  attribute: JSXAttribute | JSXSpreadAttribute,
  owner: string,
  isComponent: boolean
): void => {
  const { isHtml } = plan.options;

  if (attribute.type === "JSXSpreadAttribute") {
    plan.edits.push(toRemoval(plan.source, attribute));
    plan.dropped.add(`<${owner}> spread props`);

    return;
  }

  const name = toAttributeName(attribute);
  const text = toStringValue(attribute.value);

  if (isHtml && name === "key") {
    plan.edits.push(toRemoval(plan.source, attribute));

    return;
  }

  const css = toStyleText(toStyleExpression(attribute.value));

  if (isHtml && name === "style" && css !== null) {
    const [start, end] = toRange(attribute);
    plan.edits.push(toEdit(start, end, `style="${css}"`));

    return;
  }

  if (isHtml && name === "className" && text !== null) {
    const [start, end] = toRange(attribute);
    plan.edits.push(toEdit(start, end, `class="${text}"`));

    return;
  }

  const isAllowed = !isComponent || KEEP_ON_COMPONENT.test(name);
  const isStatic = !isHtml || (text !== null && !IS_UNSAFE_NAME.test(name));

  if (isAllowed && isStatic) {
    return;
  }

  plan.edits.push(toRemoval(plan.source, attribute));
  plan.dropped.add(toDropLabel(owner, name));
};

const setRename = (plan: Plan, element: JSXElement, label: string): void => {
  const [start, end] = toRange(element.openingElement.name);

  plan.edits.push(
    toEdit(start, end, "div"),
    toEdit(end, end, ` data-pattern-unmapped="${label.replaceAll('"', "")}"`)
  );

  if (element.closingElement) {
    const [closeStart, closeEnd] = toRange(element.closingElement.name);
    plan.edits.push(toEdit(closeStart, closeEnd, "div"));
  }
};

const setSelfClose = (
  plan: Plan,
  opening: JSXOpeningElement,
  tag: string
): void => {
  const needsClose =
    plan.options.isHtml && opening.selfClosing && !VOID_TAGS.has(tag);

  if (needsClose) {
    const [, end] = toRange(opening);
    plan.edits.push(toEdit(end - SELF_CLOSE, end, `></${tag}>`));
  }
};

const setElement = (plan: Plan, element: JSXElement): void => {
  const opening = element.openingElement;
  const root = toRootName(opening.name);

  const label = toLabel(plan.source, opening.name);

  const isComponent = COMPONENT_NAME.test(root);

  const isConverted =
    isComponent && (plan.options.isHtml || plan.options.unmapped.has(root));

  let tag = label;

  if (isConverted) {
    tag = "div";
    setRename(plan, element, label);
  }

  if (isConverted || plan.options.isHtml) {
    for (const attribute of opening.attributes) {
      setAttribute(plan, attribute, label, isConverted);
    }
  }

  setSelfClose(plan, opening, tag);
};

const setContainerChild = (
  plan: Plan,
  container: JSXExpressionContainer
): void => {
  const [start, end] = toRange(container);
  const { expression } = container;

  if (expression.type === "StringLiteral") {
    plan.edits.push(toEdit(start, end, expression.value));

    return;
  }

  plan.edits.push(toEdit(start, end, ""));

  if (expression.type !== "JSXEmptyExpression") {
    plan.dropped.add(`expression {${toLabel(plan.source, expression)}}`);
  }
};

const isElementParent = (parent: Node | null): boolean =>
  parent !== null &&
  (parent.type === "JSXElement" || parent.type === "JSXFragment");

const setNode = (plan: Plan, node: Node, parent: Node | null): void => {
  if (
    node.type === "JSXExpressionContainer" &&
    plan.options.isHtml &&
    isElementParent(parent)
  ) {
    setContainerChild(plan, node);

    return;
  }

  if (node.type === "JSXElement") {
    setElement(plan, node);
  }

  if (node.type === "JSXFragment" && parent !== null && plan.options.isHtml) {
    const [start, end] = toRange(node);

    plan.edits.push(
      toEdit(start, start + FRAGMENT_OPEN, ""),
      toEdit(end - FRAGMENT_CLOSE, end, "")
    );
  }

  for (const child of toChildren(node)) {
    setNode(plan, child, node);
  }
};

const applyEdits = (source: string, edits: readonly Edit[]): string => {
  const ordered = edits.toSorted(
    (left, right) => right.start - left.start || right.end - left.end
  );

  let text = source;

  for (const edit of ordered) {
    text = text.slice(0, edit.start) + edit.text + text.slice(edit.end);
  }

  return text;
};

const toConvertedSnippet = (
  source: string,
  root: JSXFragment,
  options: ConvertOptions
): ConvertResult => {
  const plan: Plan = {
    dropped: new Set<string>(),
    edits: [],
    options,
    source,
  };

  for (const child of root.children) {
    setNode(plan, child, root);
  }

  const next = applyEdits(source, plan.edits);

  return {
    dropped: [...plan.dropped],
    text: next.slice(WRAP_HEAD, next.length - WRAP_TAIL),
  };
};

export { toConvertedSnippet };

export type { ConvertOptions, ConvertResult };
