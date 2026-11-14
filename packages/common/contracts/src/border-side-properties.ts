const BORDER_STYLE_PROPERTIES = [
  "border-radius",
  "border-width",
  "border-top-width",
  "border-right-width",
  "border-bottom-width",
  "border-left-width",
  "border-style",
  "border-color",
] as const;

const BORDER_SIDE_WIDTHS = [
  "border-top-width",
  "border-right-width",
  "border-bottom-width",
  "border-left-width",
] as const;

type BorderSideWidth = (typeof BORDER_SIDE_WIDTHS)[number];

export { BORDER_SIDE_WIDTHS, BORDER_STYLE_PROPERTIES };

export type { BorderSideWidth };
