type AttrKind = "expr" | "flag" | "text";

interface JsxAttr {
  readonly kind: AttrKind;
  readonly name: string;
  readonly value: string;
}

interface JsxNode {
  readonly attrs: readonly JsxAttr[];
  readonly children: readonly JsxNode[];
  readonly name: string;
  readonly raw: string | null;
}

const INDENT = "  ";

const LINE_MAX = 80;

const SAFE_TEXT = /^[^"\\\n]*$/u;

const toText = (name: string, value: string): JsxAttr => ({
  kind: "text",
  name,
  value,
});

const toExpr = (name: string, value: string): JsxAttr => ({
  kind: "expr",
  name,
  value,
});

const toFlag = (attrName: string): JsxAttr => ({
  kind: "flag",
  name: attrName,
  value: "",
});

const toElement = (
  name: string,
  attrs: readonly JsxAttr[],
  children: readonly JsxNode[]
): JsxNode => ({ attrs, children, name, raw: null });

const toRawChild = (raw: string): JsxNode => ({
  attrs: [],
  children: [],
  name: "",
  raw,
});

const toAttrText = (attr: JsxAttr): string => {
  if (attr.kind === "flag") {
    return attr.name;
  }

  if (attr.kind === "expr") {
    return `${attr.name}={${attr.value}}`;
  }

  if (SAFE_TEXT.test(attr.value)) {
    return `${attr.name}="${attr.value}"`;
  }

  return `${attr.name}={${JSON.stringify(attr.value)}}`;
};

const toOpenLines = (node: JsxNode, closer: string): string[] => {
  const attrs = node.attrs.map((attr) => toAttrText(attr));
  const inline = [node.name, ...attrs].join(" ");

  if (inline.length + closer.length + 1 <= LINE_MAX) {
    return [`<${inline}${closer}`];
  }

  return [
    `<${node.name}`,
    ...attrs.map((attr) => `${INDENT}${attr}`),
    closer.trimStart(),
  ];
};

const toLines = (node: JsxNode): string[] => {
  if (node.raw !== null) {
    return [node.raw];
  }

  if (node.children.length === 0) {
    return toOpenLines(node, " />");
  }

  const only = node.children.at(0)?.raw ?? null;

  if (node.children.length === 1 && only !== null) {
    return [`${toOpenLines(node, ">").join(" ")}${only}</${node.name}>`];
  }

  return [
    ...toOpenLines(node, ">"),
    ...node.children.flatMap((child) =>
      toLines(child).map((line) => `${INDENT}${line}`)
    ),
    `</${node.name}>`,
  ];
};

export { toElement, toExpr, toFlag, toLines, toRawChild, toText };

export type { JsxAttr, JsxNode };
