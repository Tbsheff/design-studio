type SvgAttr = readonly [string, string];

type IconNode = readonly [string, readonly SvgAttr[]];

interface SvgFrame {
  fill: string;
  stroke: string;
  strokeWidth: string;
  viewBox: string;
}

interface SvgLook {
  color: string | null;
  name: string;
  size: number;
}

const NODE = /\[\s*"(?<tag>\w+)",\s*\{(?<body>[^}]*)\}\s*\]/gu;
const ELEMENT = /createElement\(\s*"(?<tag>\w+)",\s*\{(?<body>[^}]*)\}/gu;
const KEY_LEAD = /^[\s,{]+/u;
const KEY_NAME = /^[\w-]+$/u;
const KEPT_KEY = /^(?:viewBox|aria-.*|data-.*)$/u;
const UPPER = /[A-Z]/gu;
const DASHED = /-(?<letter>[a-z])/gu;
const SIZE_STEP = 4;

const SVG_ELEMENTS = new Set([
  "circle",
  "ellipse",
  "line",
  "path",
  "polygon",
  "polyline",
  "rect",
]);

const keyBefore = (parts: readonly string[], index: number): string => {
  const before = (parts[index - 1] ?? "").trim();

  if (!before.endsWith(":")) {
    return "";
  }

  const head = before.slice(0, -1).replace(KEY_LEAD, "").trim();

  if (head) {
    return head;
  }

  return parts[index - 2] ?? "";
};

const attrsOf = (body: string): SvgAttr[] => {
  const parts = body.split('"');
  const attrs: SvgAttr[] = [];

  for (let index = 1; index < parts.length; index += 2) {
    const key = keyBefore(parts, index);

    if (KEY_NAME.test(key) && key !== "key") {
      attrs.push([key, parts[index] ?? ""]);
    }
  }

  return attrs;
};

const nodesBy = (pattern: RegExp, text: string): IconNode[] =>
  [...text.matchAll(pattern)].flatMap((match): IconNode[] => {
    const tag = match.groups?.["tag"] ?? "";

    if (!SVG_ELEMENTS.has(tag)) {
      return [];
    }

    return [[tag, attrsOf(match.groups?.["body"] ?? "")]];
  });

const nodeArrayOf = (text: string): IconNode[] => nodesBy(NODE, text);

const createElementNodesOf = (text: string): IconNode[] =>
  nodesBy(ELEMENT, text);

const kebab = (key: string): string =>
  key.replaceAll(UPPER, (letter) => `-${letter.toLowerCase()}`);

const camel = (key: string): string =>
  key.replaceAll(DASHED, (_all, letter: string) => letter.toUpperCase());

const attrName = (key: string, jsx: boolean): string => {
  if (KEPT_KEY.test(key)) {
    return key;
  }

  if (!jsx) {
    return kebab(key);
  }

  if (key === "class") {
    return "className";
  }

  return camel(key);
};

const escapeAttr = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;");

const attrText = (attrs: readonly SvgAttr[], jsx: boolean): string =>
  attrs
    .map(([key, value]) => `${attrName(key, jsx)}="${escapeAttr(value)}"`)
    .join(" ");

const colorAttr = (color: string | null, jsx: boolean): string => {
  if (!color) {
    return "";
  }

  const value = `var(--${color})`;

  if (jsx) {
    return ` style={{ color: "${value}" }}`;
  }

  return ` style="color: ${value}"`;
};

const tagText = (tag: string, attrs: string, close: string): string =>
  ["<", tag, " ", attrs, close].join("");

const svgMarkup = (
  nodes: readonly IconNode[],
  frame: SvgFrame,
  look: SvgLook,
  jsx: boolean
): string => {
  const root = attrText(
    Object.entries({
      "aria-hidden": "true",
      "data-icon": look.name,
      fill: frame.fill,
      height: String(look.size),
      stroke: frame.stroke,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      strokeWidth: frame.strokeWidth,
      viewBox: frame.viewBox,
      width: String(look.size),
      xmlns: "http://www.w3.org/2000/svg",
    }),
    jsx
  );

  const children = nodes
    .map(([tag, attrs]) => tagText(tag, attrText(attrs, jsx), " />"))
    .join("");

  return [
    tagText("svg", root, colorAttr(look.color, jsx)),
    ">",
    children,
    "</",
    "svg>",
  ].join("");
};

const sizeClass = (size: number): string => {
  if (size % SIZE_STEP === 0) {
    return `size-${size / SIZE_STEP}`;
  }

  return `size-[${size}px]`;
};

const componentMarkup = (component: string, look: SvgLook): string => {
  const classes = [sizeClass(look.size)];

  if (look.color) {
    classes.push(`text-${look.color}`);
  }

  return tagText(component, `className="${classes.join(" ")}"`, " />");
};

export {
  componentMarkup,
  createElementNodesOf,
  nodeArrayOf,
  sizeClass,
  svgMarkup,
};

export type { IconNode, SvgAttr, SvgFrame, SvgLook };
