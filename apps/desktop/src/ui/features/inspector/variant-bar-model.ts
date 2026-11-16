import { DEFAULT_BREAKPOINTS } from "../../../shared/variants.js";
import type {
  Breakpoint,
  ParsedVariant,
  VariantSupport,
} from "../../../shared/variants.js";

interface WidthOption {
  readonly label: string;
  readonly value: string;
}

const SHOWN_BREAKPOINTS = 4;

const ANY_WIDTH = "";

const BASE: ParsedVariant = {
  breakpoint: null,
  dark: false,
  group: null,
  states: [],
};

const toBreakpoints = (support: VariantSupport | null): Breakpoint[] => {
  let list: readonly Breakpoint[] = DEFAULT_BREAKPOINTS;

  if (support && support.breakpoints.length > 0) {
    list = support.breakpoints;
  }

  return list.slice(0, SHOWN_BREAKPOINTS);
};

const toFrameWidth = (
  next: ParsedVariant,
  breakpoints: readonly Breakpoint[]
): number | null => {
  if (!next.breakpoint) {
    return null;
  }

  const found = breakpoints.find((entry) => entry.name === next.breakpoint);

  return found?.px ?? null;
};

const toWidthOptions = (breakpoints: readonly Breakpoint[]): WidthOption[] => [
  { label: "All widths", value: ANY_WIDTH },
  ...breakpoints.map((entry) => ({
    label: `${entry.name} ${entry.px}+`,
    value: entry.name,
  })),
];

const toSetList = (support: VariantSupport | null): string => {
  const set = support?.set ?? [];

  if (support?.mode === "css") {
    return set.join("; ");
  }

  return set.join(" ");
};

const toSummary = (prefix: string, support: VariantSupport | null): string => {
  if (support?.mode === "none") {
    return support.reason ?? "This element cannot take variant styles.";
  }

  if (prefix === "") {
    return "Edits change the base style.";
  }

  let where = "classes";

  if (support?.mode === "css") {
    where = "a CSS rule";
  }

  if ((support?.set ?? []).length === 0) {
    return `Nothing set yet. Edits write ${where}; dim values come from the base.`;
  }

  return `Set here: ${toSetList(support)}. Dim values come from the base.`;
};

export {
  ANY_WIDTH,
  BASE,
  toBreakpoints,
  toFrameWidth,
  toSummary,
  toWidthOptions,
};

export type { WidthOption };
