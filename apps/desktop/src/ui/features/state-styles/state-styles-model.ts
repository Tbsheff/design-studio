import { copy } from "./copy.js";
import {
  isEdgeStateName,
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

const DATA_CHIPS: readonly ChipId[] = [
  "open",
  "closed",
  "checked",
  "on",
  "selected",
];

const ACTIVE_ITEM_CHIPS: readonly ChipId[] = ["active-item"];

const INVALID_CHIPS: readonly ChipId[] = ["invalid"];

const GROUP_HOVER_CHIPS: readonly ChipId[] = ["group-hover"];

const GROUP_DATA_CHIPS: readonly ChipId[] = ["group-open", "group-checked"];

const EDGE_CHIPS: readonly ChipId[] = ["first", "last", "odd", "even"];

const START_TAG = /^<[^>]*>/u;

const DATA_STATE_ATTR = /\sdata-state\s*=/u;

const DATA_STATE_CLASS = /(?:^|[\s"':])data-\[state=/u;

const DATA_ACTIVE_ATTR = /\sdata-active\s*=/u;

const DATA_ACTIVE_CLASS = /(?:^|[\s"':])data-\[active=/u;

const FIELD_TAG = /^<(?:input|textarea|select)[\s/>]/iu;

const COMBOBOX_ROLE = /\srole\s*=\s*["']?combobox/iu;

const INVALID_CLASS = /(?:^|[\s"':])aria-invalid:/u;

const BASE: ParsedVariant = {
  breakpoint: null,
  dark: false,
  group: null,
  states: [],
};

const toStartTag = (outerHTML: string): string =>
  START_TAG.exec(outerHTML)?.[0] ?? "";

const hasStateStyles = (
  info: StateListResult | null,
  chips: readonly ChipId[]
): boolean => {
  const wanted = new Set(chips);

  return (
    info !== null &&
    info.layer.overrides.some((entry) => wanted.has(entry.state))
  );
};

const isDataStateFit = (start: string, info: StateListResult | null): boolean =>
  DATA_STATE_ATTR.test(start) ||
  DATA_STATE_CLASS.test(start) ||
  hasStateStyles(info, DATA_CHIPS);

const isActiveItemFit = (
  start: string,
  info: StateListResult | null
): boolean =>
  DATA_ACTIVE_ATTR.test(start) ||
  DATA_ACTIVE_CLASS.test(start) ||
  hasStateStyles(info, ACTIVE_ITEM_CHIPS);

const isInvalidFit = (start: string, info: StateListResult | null): boolean =>
  FIELD_TAG.test(start) ||
  COMBOBOX_ROLE.test(start) ||
  INVALID_CLASS.test(start) ||
  hasStateStyles(info, INVALID_CHIPS);

const toDataChips = (
  outerHTML: string,
  info: StateListResult | null
): readonly ChipId[] => {
  const start = toStartTag(outerHTML);
  const chips: ChipId[] = [];

  if (isDataStateFit(start, info)) {
    chips.push(...DATA_CHIPS);
  }

  if (isActiveItemFit(start, info)) {
    chips.push(...ACTIVE_ITEM_CHIPS);
  }

  if (isInvalidFit(start, info)) {
    chips.push(...INVALID_CHIPS);
  }

  return chips;
};

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

const toEdgeChips = (info: StateListResult | null): readonly ChipId[] => {
  if ((info?.edge ?? null) === null) {
    return [];
  }

  return EDGE_CHIPS;
};

const toEdgeNote = (
  active: ChipId | null,
  info: StateListResult | null
): string | null => {
  const kind = info?.edge ?? null;

  if (active === null || kind === null || !isEdgeStateName(active)) {
    return null;
  }

  return copy.edge[kind][active];
};

const chipsFor = (
  outerHTML: string,
  info: StateListResult | null
): readonly ChipId[] => [
  ...CHIPS,
  ...toDataChips(outerHTML, info),
  ...toGroupChips(info),
  ...toEdgeChips(info),
];

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

const hasPrefixPart = (info: StateListResult | null, part: string): boolean =>
  info !== null &&
  info.layer.overrides.some((entry) => entry.prefix.split(":").includes(part));

const partOf = (
  chip: Exclude<ChipId, "dark" | "default">,
  info: StateListResult | null
): PseudoPart => {
  if (
    chip === "selected" &&
    hasPrefixPart(info, toDataStateVariant("selected-item"))
  ) {
    return "selected-item";
  }

  if (
    chip === "disabled" &&
    hasPrefixPart(info, toDataStateVariant("disabled-item"))
  ) {
    return "disabled-item";
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
  toEdgeNote,
};

export type { ChipId };
