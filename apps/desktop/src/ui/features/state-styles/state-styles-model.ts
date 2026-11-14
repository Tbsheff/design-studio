import {
  parseVariant,
  toDataStateVariant,
  toStyleStateName,
  variantPrefix,
} from "./deps.js";
import type {
  ParsedVariant,
  SaveStatus,
  StateListResult,
  StyleState,
} from "./deps.js";

type ChipId = "default" | StyleState;

type PseudoPart = ParsedVariant["states"][number];

const CHIPS: readonly ChipId[] = [
  "default",
  "hover",
  "focus-visible",
  "active",
  "disabled",
  "dark",
];

const DATA_CHIPS: readonly ChipId[] = ["open", "checked", "selected"];

const START_TAG = /^<[^>]*>/u;

const DATA_STATE_ATTR = /\sdata-state\s*=/u;

const DATA_STATE_CLASS = "data-[state=";

const BASE: ParsedVariant = { breakpoint: null, dark: false, states: [] };

const hasDataStateTag = (outerHTML: string): boolean => {
  const start = START_TAG.exec(outerHTML)?.[0] ?? "";

  return DATA_STATE_ATTR.test(start) || start.includes(DATA_STATE_CLASS);
};

const hasDataStateStyles = (info: StateListResult | null): boolean =>
  info !== null &&
  info.layer.overrides.some((entry) => entry.prefix.includes(DATA_STATE_CLASS));

const chipsFor = (
  outerHTML: string,
  info: StateListResult | null
): readonly ChipId[] => {
  if (hasDataStateTag(outerHTML) || hasDataStateStyles(info)) {
    return [...CHIPS, ...DATA_CHIPS];
  }

  return CHIPS;
};

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

  if (first === "focus") {
    return null;
  }

  return toStyleStateName(first);
};

const stateWire = (chip: ChipId): StyleState | null => {
  if (chip === "default") {
    return null;
  }

  return chip;
};

const isSelectedItem = (info: StateListResult | null): boolean =>
  info !== null &&
  info.layer.overrides.some((entry) =>
    entry.prefix.includes(toDataStateVariant("selected-item"))
  );

const partOf = (
  chip: Exclude<ChipId, "dark" | "default">,
  info: StateListResult | null
): PseudoPart => {
  if (chip === "selected" && isSelectedItem(info)) {
    return "selected-item";
  }

  return chip;
};

const prefixFor = (
  current: string,
  chip: ChipId,
  info: StateListResult | null
): string => {
  const { breakpoint } = parseVariant(current) ?? BASE;

  if (chip === "default") {
    return variantPrefix({ breakpoint, dark: false, states: [] });
  }

  if (chip === "dark") {
    return variantPrefix({ breakpoint, dark: true, states: [] });
  }

  return variantPrefix({
    breakpoint,
    dark: false,
    states: [partOf(chip, info)],
  });
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
  chipsFor,
  hasDot,
  isTypingTarget,
  prefixFor,
  roundOf,
  stateOf,
  stateWire,
  styledStates,
};

export type { ChipId };
