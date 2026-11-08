const LT = "<";

const GT = ">";

const INDENT = "  ";

type MarkupFlavor = "html" | "jsx";

type MarkupAttribute = readonly [name: string, value: string];

interface MarkupElement {
  readonly attrs: readonly MarkupAttribute[];
  readonly children: readonly MarkupElement[];
  readonly isVoid: boolean;
  readonly tag: string;
  readonly text: string;
}

const toAttributes = (
  values: Readonly<Record<string, string>>
): readonly MarkupAttribute[] => Object.entries(values);

const toElement = (
  tag: string,
  attrs: Readonly<Record<string, string>>,
  children: readonly MarkupElement[]
): MarkupElement => {
  const text = "";
  const isVoid = false;

  return { attrs: toAttributes(attrs), children, isVoid, tag, text };
};

const toTextElement = (
  tag: string,
  attrs: Readonly<Record<string, string>>,
  text: string
): MarkupElement => {
  const children: readonly MarkupElement[] = [];
  const isVoid = false;

  return { attrs: toAttributes(attrs), children, isVoid, tag, text };
};

const toVoidElement = (
  tag: string,
  attrs: Readonly<Record<string, string>>
): MarkupElement => {
  const children: readonly MarkupElement[] = [];
  const isVoid = true;
  const text = "";

  return { attrs: toAttributes(attrs), children, isVoid, tag, text };
};

const toAttributeName = (name: string, flavor: MarkupFlavor): string => {
  if (flavor === "jsx" && name === "class") {
    return "className";
  }

  if (flavor === "jsx" && name === "for") {
    return "htmlFor";
  }

  return name;
};

const toEscapedAttribute = (value: string): string =>
  value.replaceAll('"', "&quot;");

const toAttributeText = (
  attrs: readonly MarkupAttribute[],
  flavor: MarkupFlavor
): string =>
  attrs
    .map(
      ([name, value]) =>
        ` ${toAttributeName(name, flavor)}="${toEscapedAttribute(value)}"`
    )
    .join("");

const toMarkupLines = (
  node: MarkupElement,
  flavor: MarkupFlavor
): readonly string[] => {
  const open = `${LT}${node.tag}${toAttributeText(node.attrs, flavor)}`;

  if (node.isVoid) {
    return [`${open} /${GT}`];
  }

  const close = `${LT}/${node.tag}${GT}`;

  if (node.children.length === 0) {
    return [`${open}${GT}${node.text}${close}`];
  }

  const inner = node.children.flatMap((child) =>
    toMarkupLines(child, flavor).map((line) => `${INDENT}${line}`)
  );

  return [`${open}${GT}`, ...inner, close];
};

const toMarkupText = (
  nodes: readonly MarkupElement[],
  flavor: MarkupFlavor
): string => nodes.flatMap((node) => toMarkupLines(node, flavor)).join("\n");

const toEscapedText = (text: string): string =>
  text.replaceAll("&", "&amp;").replaceAll(LT, "&lt;").replaceAll(GT, "&gt;");

export {
  GT,
  LT,
  toElement,
  toEscapedText,
  toMarkupLines,
  toMarkupText,
  toTextElement,
  toVoidElement,
};

export type { MarkupAttribute, MarkupElement, MarkupFlavor };
