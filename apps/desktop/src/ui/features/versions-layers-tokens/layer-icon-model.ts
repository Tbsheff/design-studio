import type { LayerNode } from "@design-studio/contracts";
import type { IconName } from "@design-studio/ui";

const TEXT_TAGS = new Set([
  "abbr",
  "b",
  "blockquote",
  "cite",
  "code",
  "dd",
  "dt",
  "em",
  "figcaption",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "i",
  "label",
  "li",
  "mark",
  "p",
  "pre",
  "q",
  "small",
  "span",
  "strong",
  "sub",
  "sup",
  "time",
]);

const IMAGE_TAGS = new Set(["canvas", "iframe", "img", "picture", "video"]);

const VECTOR_TAGS = new Set([
  "circle",
  "ellipse",
  "g",
  "line",
  "path",
  "polygon",
  "polyline",
  "rect",
  "svg",
  "use",
]);

const CONTROL_TAGS = new Set(["button", "input", "select", "textarea"]);

const toLayerIcon = (node: LayerNode): IconName => {
  const tag = node.tag.toLowerCase();

  if (IMAGE_TAGS.has(tag)) {
    return "image";
  }

  if (VECTOR_TAGS.has(tag)) {
    return "token";
  }

  if (tag === "a") {
    return "link";
  }

  if (CONTROL_TAGS.has(tag)) {
    return "pointer";
  }

  if (TEXT_TAGS.has(tag) || (node.childCount === 0 && node.text)) {
    return "alignLeft";
  }

  return "frame";
};

export { toLayerIcon };
