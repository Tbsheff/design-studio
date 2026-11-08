import { SLOT_FALLBACKS } from "./slot-fallbacks.js";
import type {
  BlockAttrs,
  BlockChild,
  BlockNode,
  BlockRender,
  BlockRenderOptions,
  BlockTemplate,
  SlotFallback,
} from "./types.js";

const SLOT_NAME = /^[A-Z]/u;

const VOID_TAGS: ReadonlySet<string> = new Set(["input"]);

const HTML_ATTRS: ReadonlyMap<string, string> = new Map([
  ["className", "class"],
  ["defaultValue", "value"],
  ["htmlFor", "for"],
]);

const INDENT = "  ";

const isNode = (child: BlockChild): child is BlockNode =>
  typeof child !== "string";

const listSlots = (node: BlockNode, names: Set<string>): void => {
  if (SLOT_NAME.test(node.tag)) {
    names.add(node.tag);
  }

  for (const child of node.children) {
    if (isNode(child)) {
      listSlots(child, names);
    }
  }
};

const toBlockComponents = (template: BlockTemplate): readonly string[] => {
  const names = new Set<string>();

  listSlots(template.root, names);

  return [...names];
};

const toFallbackAttrs = (
  attrs: BlockAttrs,
  fallback: SlotFallback
): BlockAttrs => {
  const dropped = new Set(fallback.drop);
  const kept = Object.entries(attrs).filter(([name]) => !dropped.has(name));

  const own = attrs["className"] ?? "";
  const className = `${fallback.className} ${own}`.trim();

  return { ...Object.fromEntries(kept), ...fallback.attrs, className };
};

const toRendered = (
  node: BlockNode,
  options: BlockRenderOptions,
  used: Set<string>
): BlockNode => {
  const children = node.children.map((child) => {
    if (isNode(child)) {
      return toRendered(child, options, used);
    }

    return child;
  });

  const fallback = SLOT_FALLBACKS.get(node.tag) ?? null;
  const isKept = !options.isHtml && options.available.has(node.tag);

  if (fallback === null || isKept) {
    return { ...node, children };
  }

  used.add(node.tag);

  const attrs = toFallbackAttrs(node.attrs, fallback);
  const { tag } = fallback;

  return { attrs, children, tag };
};

const toAttrText = (attrs: BlockAttrs, isHtml: boolean): string => {
  let text = "";

  for (const [name, value] of Object.entries(attrs)) {
    if (value !== "") {
      let renamed = name;

      if (isHtml) {
        renamed = HTML_ATTRS.get(name) ?? name;
      }

      text += ` ${renamed}="${value}"`;
    }
  }

  return text;
};

const toMarkup = (node: BlockNode, depth: number, isHtml: boolean): string => {
  const pad = INDENT.repeat(depth);
  const open = `<${node.tag}${toAttrText(node.attrs, isHtml)}`;

  if (VOID_TAGS.has(node.tag) || node.children.length === 0) {
    return `${pad}${open} />`;
  }

  if (!node.children.some((child) => isNode(child))) {
    return `${pad}${open}>${node.children.join("")}</${node.tag}>`;
  }

  const lines = node.children.map((child) => {
    if (isNode(child)) {
      return toMarkup(child, depth + 1, isHtml);
    }

    return `${pad}${INDENT}${child}`;
  });

  return [`${pad}${open}>`, ...lines, `${pad}</${node.tag}>`].join("\n");
};

const toBlockMarkup = (
  template: BlockTemplate,
  options: BlockRenderOptions
): BlockRender => {
  const used = new Set<string>();
  const root = toRendered(template.root, options, used);

  const fallbacks: string[] = [];

  for (const name of toBlockComponents(template)) {
    if (used.has(name)) {
      fallbacks.push(name);
    }
  }

  return { fallbacks, markup: toMarkup(root, 0, options.isHtml) };
};

export { toBlockComponents, toBlockMarkup };
