import { DEFAULT_BREAKPOINTS } from "../../../shared/variants.js";
import type {
  Breakpoint,
  ParsedVariant,
  VariantState,
  VariantSupport,
} from "../../../shared/variants.js";

interface StateChip {
  readonly id: VariantState;
  readonly label: string;
}

interface WidthOption {
  readonly label: string;
  readonly value: string;
}

const STATES: readonly StateChip[] = [
  { id: "hover", label: "Hover" },
  { id: "focus", label: "Focus" },
  { id: "active", label: "Active" },
];

const STATE_VERBS: Readonly<Record<VariantState, string>> = {
  active: "pressed",
  focus: "focused",
  hover: "hovered",
};

const SHOWN_BREAKPOINTS = 4;

const ANY_WIDTH = "";

const BASE: ParsedVariant = {
  breakpoint: null,
  dark: false,
  group: null,
  states: [],
};

const DARK_CHIP = "dark";

const toBreakpoints = (support: VariantSupport | null): Breakpoint[] => {
  let list: readonly Breakpoint[] = DEFAULT_BREAKPOINTS;

  if (support && support.breakpoints.length > 0) {
    list = support.breakpoints;
  }

  return list.slice(0, SHOWN_BREAKPOINTS);
};

const toChipClass = (isPressed: boolean): string => {
  if (isPressed) {
    return "ins-variant-chip on";
  }

  return "ins-variant-chip";
};

type PseudoStateId = ParsedVariant["states"][number];

const isStateId = (id: string): id is PseudoStateId =>
  STATES.some((state) => state.id === id);

const toStateTip = (state: StateChip): string =>
  `${state.label} state. The frame shows the element as if ${STATE_VERBS[state.id]}`;

const toNextStates = (
  states: readonly PseudoStateId[],
  state: PseudoStateId
): PseudoStateId[] => {
  if (states.includes(state)) {
    return [];
  }

  return [state];
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
  DARK_CHIP,
  STATES,
  isStateId,
  toBreakpoints,
  toChipClass,
  toFrameWidth,
  toNextStates,
  toStateTip,
  toSummary,
  toWidthOptions,
};

export type { StateChip, WidthOption };
