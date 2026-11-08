type AttrValue = number | string;

interface SvgNode {
  readonly attrs: Readonly<Record<string, AttrValue>>;
  readonly children: readonly SvgNode[];
  readonly name: string;
  readonly text: string | null;
}

const INDENT = "  ";

const KEEP_KEBAB = /^(?:aria|data)-/u;

const DASH_LETTER = /-(?<letter>[a-z])/gu;

const ROUND_FACTOR = 100;

const toAttrName = (name: string, isJsx: boolean): string => {
  if (!isJsx || KEEP_KEBAB.test(name)) {
    return name;
  }

  return name.replaceAll(DASH_LETTER, (_match, letter: string) =>
    letter.toUpperCase()
  );
};

const toEscaped = (text: string): string =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("{", "&#123;")
    .replaceAll("}", "&#125;");

const toRounded = (value: number): number =>
  Math.round(value * ROUND_FACTOR) / ROUND_FACTOR;

const toNode = (
  name: string,
  attrs: Readonly<Record<string, AttrValue>>,
  children: readonly SvgNode[]
): SvgNode => ({ attrs, children, name, text: null });

const toTextNode = (
  tag: string,
  attributes: Readonly<Record<string, AttrValue>>,
  content: string
): SvgNode => ({
  attrs: attributes,
  children: [],
  name: tag,
  text: content,
});

const toOpenTag = (node: SvgNode, isJsx: boolean): string => {
  const attrs = Object.entries(node.attrs).map(([name, value]) => {
    const text = toEscaped(`${value}`);

    return `${toAttrName(name, isJsx)}="${text}"`;
  });

  return [node.name, ...attrs].join(" ");
};

const toLines = (node: SvgNode, isJsx: boolean): string[] => {
  const open = toOpenTag(node, isJsx);

  if (node.text !== null) {
    return [`<${open}>${toEscaped(node.text)}</${node.name}>`];
  }

  if (node.children.length === 0) {
    return [`<${open} />`];
  }

  const inner = node.children.flatMap((child) => toLines(child, isJsx));

  return [
    `<${open}>`,
    ...inner.map((line) => `${INDENT}${line}`),
    `</${node.name}>`,
  ];
};

const toMarkup = (node: SvgNode, isJsx: boolean): string =>
  toLines(node, isJsx).join("\n");

export { toEscaped, toMarkup, toNode, toRounded, toTextNode };

export type { AttrValue, SvgNode };
