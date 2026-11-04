import { parseVariant, variantPrefix } from "./deps.js";
import type {
  ParsedVariant,
  SaveStatus,
  StateListResult,
  StyleState,
} from "./deps.js";

type ChipId = "default" | StyleState;

const CHIPS: readonly ChipId[] = [
  "default",
  "hover",
  "focus-visible",
  "active",
  "disabled",
  "dark",
];

const BASE: ParsedVariant = { breakpoint: null, dark: false, states: [] };

const isInteraction = (part: string): part is Exclude<StyleState, "dark"> =>
  part === "hover" ||
  part === "focus-visible" ||
  part === "active" ||
  part === "disabled";

const stateOf = (prefix: string): ChipId | null => {
  const parsed = parseVariant(prefix) ?? BASE;
  const [first = null, ...rest] = parsed.states;

  if (parsed.dark && first === null) {
    return "dark";
  }

  if (parsed.dark || rest.length > 0) {
    return null;
  }

  if (first === null) {
    return "default";
  }

  if (isInteraction(first)) {
    return first;
  }

  return null;
};

const stateWire = (chip: ChipId): StyleState | null => {
  if (chip === "default") {
    return null;
  }

  return chip;
};

const prefixFor = (current: string, chip: ChipId): string => {
  const { breakpoint } = parseVariant(current) ?? BASE;

  if (chip === "default") {
    return variantPrefix({ breakpoint, dark: false, states: [] });
  }

  if (chip === "dark") {
    return variantPrefix({ breakpoint, dark: true, states: [] });
  }

  return variantPrefix({ breakpoint, dark: false, states: [chip] });
};

const styledStates = (
  info: StateListResult | null
): ReadonlySet<StyleState> => {
  if (!info) {
    return new Set();
  }

  const styled = new Set<StyleState>();

  for (const entry of info.layer.overrides) {
    if (entry.set.length > 0) {
      styled.add(entry.state);
    }
  }

  return styled;
};

const hasDot = (chip: ChipId, styled: ReadonlySet<StyleState>): boolean =>
  chip !== "default" && styled.has(chip);

const roundOf = (status: SaveStatus): number => {
  if (status.kind === "saved") {
    return status.at;
  }

  return 0;
};

const isTypingTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
};

export {
  CHIPS,
  hasDot,
  isTypingTarget,
  prefixFor,
  roundOf,
  stateOf,
  stateWire,
  styledStates,
};

export type { ChipId };
