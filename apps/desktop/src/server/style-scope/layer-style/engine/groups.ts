import type { LAYER_STYLE_GROUPS } from "@design-studio/actions/layer-style/schema";

type LayerStyleGroup = (typeof LAYER_STYLE_GROUPS)[number];

interface StyleDeclaration {
  readonly property: string;
  readonly value: string;
}

interface ReadProperty {
  readonly property: string;
  readonly read: string;
}

interface ClassPlan {
  readonly add: readonly string[];
  readonly remove: readonly string[];
}

interface GroupClasses {
  readonly classes: readonly string[];
  readonly group: LayerStyleGroup;
}

const BORDER = "border";
const BORDER_COLOR = "border-color";
const BORDER_STYLE = "border-style";
const BORDER_WIDTH = "border-width";

const GROUP_ORDER: readonly LayerStyleGroup[] = [
  "fill",
  "text",
  "spacing",
  "size",
  "border",
  "radius",
  "effect",
  "layout",
];

const SIDED_GROUPS: ReadonlyMap<string, LayerStyleGroup> = new Map([
  ["dims", "size"],
  ["gap", "spacing"],
  ["padding", "spacing"],
  ["radius", "radius"],
]);

const SINGLE_GROUPS: ReadonlyMap<string, LayerStyleGroup> = new Map([
  ["bg", "fill"],
  ["bg-image", "fill"],
  ["bg-position", "fill"],
  ["bg-repeat", "fill"],
  ["bg-size", "fill"],
  [BORDER_COLOR, BORDER],
  [BORDER_STYLE, BORDER],
  [BORDER_WIDTH, BORDER],
  ["case", "text"],
  ["color", "text"],
  ["decoration", "text"],
  ["display", "layout"],
  ["filter", "effect"],
  ["flex", "layout"],
  ["flex-direction", "layout"],
  ["flex-wrap", "layout"],
  ["font-family", "text"],
  ["font-size", "text"],
  ["font-style", "text"],
  ["font-weight", "text"],
  ["items", "layout"],
  ["justify", "layout"],
  ["justify-items", "layout"],
  ["leading", "text"],
  ["opacity", "effect"],
  ["overflow", "layout"],
  ["self", "layout"],
  ["shadow", "effect"],
  ["text-align", "text"],
  ["text-shadow", "text"],
  ["tracking", "text"],
]);

const CSS_PROPERTIES: Readonly<Record<LayerStyleGroup, readonly string[]>> = {
  border: [BORDER_WIDTH, BORDER_STYLE, BORDER_COLOR],
  effect: ["box-shadow", "filter", "opacity"],
  fill: [
    "background-color",
    "background-image",
    "background-size",
    "background-position",
    "background-repeat",
  ],
  layout: [
    "display",
    "flex-direction",
    "flex-wrap",
    "justify-content",
    "align-items",
    "align-self",
    "flex",
    "overflow",
  ],
  radius: ["border-radius"],
  size: [
    "width",
    "height",
    "min-width",
    "max-width",
    "min-height",
    "max-height",
  ],
  spacing: [
    "padding-top",
    "padding-right",
    "padding-bottom",
    "padding-left",
    "row-gap",
    "column-gap",
  ],
  text: [
    "color",
    "font-family",
    "font-size",
    "font-weight",
    "line-height",
    "letter-spacing",
    "text-align",
    "font-style",
    "text-decoration-line",
    "text-transform",
    "text-shadow",
  ],
};

const READ_NAMES: ReadonlyMap<string, string> = new Map([
  [BORDER_COLOR, "border-top-color"],
  [BORDER_STYLE, "border-top-style"],
  [BORDER_WIDTH, "border-top-width"],
]);

export { CSS_PROPERTIES, GROUP_ORDER, READ_NAMES, SIDED_GROUPS, SINGLE_GROUPS };

export type {
  ClassPlan,
  GroupClasses,
  LayerStyleGroup,
  ReadProperty,
  StyleDeclaration,
};
