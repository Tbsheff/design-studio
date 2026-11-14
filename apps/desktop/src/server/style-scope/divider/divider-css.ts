import { toChildRulePatch, toChildRuleProps } from "./deps.js";
import type { SourceLoc, WrittenFile } from "./deps.js";
import type {
  DividerAxis,
  DividerPaint,
  DividerParts,
} from "./divider-classes.js";
import type { DividerSite } from "./divider-site.js";
import { DividerError } from "./errors.js";

const SIDE_OF: Readonly<Record<DividerAxis, string>> = {
  x: "border-left",
  y: "border-top",
};

const WIDTH_VALUE = /^\d+px$/u;

const SPACE = /\s+/u;

const DEFAULT_COLOR = "currentColor";

const SAME = "The element already has these lines.";

const TOKEN_NOTE =
  "A CSS project has no color tokens. Pass color, such as #e5e7eb, for the line color.";

const NO_PARTS: DividerParts = {
  axis: null,
  color: null,
  isReverse: false,
  token: null,
  width: null,
};

const toPosition = (source: SourceLoc): Pick<SourceLoc, "col" | "line"> => ({
  col: source.col,
  line: source.line,
});

const toLineParts = (axis: DividerAxis, value: string): DividerParts | null => {
  const [width = "", , ...color] = value.trim().split(SPACE);

  if (!WIDTH_VALUE.test(width)) {
    return null;
  }

  return {
    axis,
    color: color.join(" ") || null,
    isReverse: false,
    token: null,
    width: Number(width.slice(0, -"px".length)),
  };
};

const toCssDividerParts = (
  site: DividerSite,
  source: SourceLoc,
  variant: string
): DividerParts => {
  const props = new Map(
    toChildRuleProps(site.code, toPosition(source), variant).map((entry) => [
      entry.prop,
      entry.value,
    ])
  );

  for (const axis of ["y", "x"] as const) {
    const parts = toLineParts(axis, props.get(SIDE_OF[axis]) ?? "");

    if (parts !== null) {
      return parts;
    }
  }

  return NO_PARTS;
};

const toColorOf = (paint: DividerPaint, current: DividerParts): string => {
  if (paint.token !== null) {
    throw new DividerError(TOKEN_NOTE);
  }

  return paint.color ?? current.color ?? DEFAULT_COLOR;
};

const toRuleBody = (paint: DividerPaint, current: DividerParts): string => {
  if (paint.axis === null) {
    return "";
  }

  const color = toColorOf(paint, current);

  return `${SIDE_OF[paint.axis]}: ${paint.width}px solid ${color};`;
};

const toCssDividerWritten = (
  site: DividerSite,
  source: SourceLoc,
  paint: DividerPaint,
  variant: string
): WrittenFile[] => {
  const current = toCssDividerParts(site, source, variant);

  if (paint.axis === null && current.axis === null) {
    throw new DividerError(SAME);
  }

  const body = toRuleBody(paint, current);

  const code = toChildRulePatch(site.code, toPosition(source), body, variant);

  if (code === site.code) {
    throw new DividerError(SAME);
  }

  return [{ code, original: site.code, target: site.target }];
};

export { toCssDividerParts, toCssDividerWritten };
