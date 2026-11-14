import {
  isDataStateStyle,
  isGroupStateName,
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

const GROUP_HOVER_CHIPS: readonly ChipId[] = ["group-hover"];

const GROUP_DATA_CHIPS: readonly ChipId[] = ["group-open", "group-checked"];

const START_TAG = /^<[^>]*>/u;

const DATA_STATE_ATTR = /\sdata-state\s*=/u;

const DATA_STATE_CLASS = /(?:^|[\s"':])data-\[state=/u;

const BASE: ParsedVariant = {
  breakpoint: null,
  dark: false,
  group: null,
  states: [],
};

const hasDataStateTag = (outerHTML: string): boolean => {
  const start = START_TAG.exec(outerHTML)?.[0] ?? "";

  return DATA_STATE_ATTR.test(start) || DATA_STATE_CLASS.test(start);
};

const hasDataStateStyles = (info: StateListResult | null): boolean =>
  info !== null &&
  info.layer.overrides.some((entry) => isDataStateStyle(entry.state));

const hasGroupDataStyles = (info: StateListResult): boolean =>
  info.layer.overrides.some(
    (entry) => entry.state === "group-open" || entry.state === "group-checked"
  );

const toGroupChips = (info: StateListResult | null): readonly ChipId[] => {
  if (info === null || info.layer.mode !== "classes") {
    return [];
  }

  if (info.group?.hasDataState === true || hasGroupDataStyles(info)) {
    return [...GROUP_HOVER_CHIPS, ...GROUP_DATA_CHIPS];
  }

  return GROUP_HOVER_CHIPS;
};

const chipsFor = (
  outerHTML: string,
  info: StateListResult | null
): readonly ChipId[] => {
  let chips = CHIPS;

  if (hasDataStateTag(outerHTML) || hasDataStateStyles(info)) {
    chips = [...CHIPS, ...DATA_CHIPS];
  }

  return [...chips, ...toGroupChips(info)];
};

const isGroupOff = (chip: ChipId, info: StateListResult | null): boolean =>
  isGroupStateName(chip) && info?.group === null;

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
    entry.prefix.split(":").includes(toDataStateVariant("selected-item"))
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
    return variantPrefix({ breakpoint, dark: false, group: null, states: [] });
  }

  if (chip === "dark") {
    return variantPrefix({ breakpoint, dark: true, group: null, states: [] });
  }

  return variantPrefix({
    breakpoint,
    dark: false,
    group: info?.group?.name ?? null,
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
  isGroupOff,
  isTypingTarget,
  prefixFor,
  roundOf,
  stateOf,
  stateWire,
  styledStates,
};

export type { ChipId };
