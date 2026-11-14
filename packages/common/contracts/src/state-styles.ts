const STYLE_STATES = [
  "hover",
  "focus-visible",
  "active",
  "disabled",
  "dark",
  "open",
  "checked",
  "selected",
  "closed",
  "on",
  "active-item",
  "invalid",
  "group-hover",
  "group-open",
  "group-checked",
  "first",
  "last",
  "odd",
  "even",
] as const;

const EDGE_STATE_VARIANTS = {
  even: "nth-child(even)",
  first: "first-child",
  last: "last-child",
  odd: "nth-child(odd)",
} as const;

const GROUP_STATE_VARIANTS = {
  "group-checked": "group-data-[state=checked]",
  "group-hover": "group-hover",
  "group-open": "group-data-[state=open]",
} as const;

const GROUP_CLASS = /^group(?:\/(?<name>[a-z0-9][a-z0-9_-]*))?$/u;

const GROUP_NAME_MAX = 40;

const DATA_STATE_VARIANTS = {
  "active-item": "data-[active=true]",
  checked: "data-[state=checked]",
  closed: "data-[state=closed]",
  "disabled-item": "data-[disabled]",
  on: "data-[state=on]",
  open: "data-[state=open]",
  selected: "data-[state=active]",
  "selected-item": "data-[state=selected]",
} as const;

const ARIA_STATE_VARIANTS = {
  invalid: "aria-invalid",
} as const;

const DATA_STATE_PART =
  /^data-\[(?<name>[a-z][a-z-]*)(?:=(?<value>[a-z]+))?\]$/u;

const FORCE_STATE_PARAM = "__studio_force";

const STATE_SELECTOR_MAX = 2000;

type StyleState = (typeof STYLE_STATES)[number];

type DataStateName = keyof typeof DATA_STATE_VARIANTS;

type AriaStateName = keyof typeof ARIA_STATE_VARIANTS;

type DataStateStyle =
  | "active-item"
  | "checked"
  | "closed"
  | "on"
  | "open"
  | "selected";

interface DataStateAttribute {
  readonly name: string;
  readonly value: string;
}

type GroupStateName = keyof typeof GROUP_STATE_VARIANTS;

type EdgeStateName = keyof typeof EDGE_STATE_VARIANTS;

type StateEdgeKind = "list" | "siblings";

type ForcedStatePart =
  | "active"
  | "disabled"
  | "focus"
  | "focus-visible"
  | "hover"
  | AriaStateName
  | DataStateName
  | EdgeStateName
  | GroupStateName;

interface GroupPart {
  readonly name: string | null;
  readonly state: GroupStateName;
}

interface GroupClass {
  readonly name: string | null;
}

interface GroupAncestor {
  readonly hasDataState: boolean;
  readonly name: string | null;
}

type StateStyleMode = "classes" | "css" | "none";

interface StateOverride {
  readonly breakpoint: string;
  readonly prefix: string;
  readonly props: readonly string[];
  readonly set: readonly string[];
  readonly state: StyleState;
}

interface StateLayer {
  readonly file: string;
  readonly mode: StateStyleMode;
  readonly overrides: readonly StateOverride[];
  readonly reason: string | null;
}

interface ForcedFrameState {
  readonly frameId: string;
  readonly selector: string | null;
  readonly state: StyleState | null;
}

interface ForcedStateChange extends ForcedFrameState {
  readonly isStructural: boolean;
}

interface StateListResult {
  readonly edge: StateEdgeKind | null;
  readonly forced: readonly ForcedFrameState[];
  readonly group: GroupAncestor | null;
  readonly layer: StateLayer;
  readonly other: readonly string[];
  readonly states: readonly StyleState[];
}

interface StateStyleInput {
  readonly breakpoint: string;
  readonly property: string;
  readonly reset: boolean;
  readonly state: StyleState;
  readonly value: string | null;
}

interface StateStyleResult {
  readonly breakpoint: string;
  readonly classes: {
    readonly add: string[];
    readonly remove: string[];
  } | null;
  readonly files: readonly string[];
  readonly mode: StateStyleMode;
  readonly prefix: string;
  readonly property: string;
  readonly state: StyleState;
  readonly title: string;
  readonly value: string | null;
  readonly versionId: string | null;
}

interface ForcedStateWire {
  readonly selector: string | null;
  readonly state: StyleState;
}

const isStyleState = (value: unknown): value is StyleState =>
  typeof value === "string" &&
  (STYLE_STATES as readonly string[]).includes(value);

const DATA_STATE_NAMES = Object.keys(DATA_STATE_VARIANTS) as DataStateName[];

const isDataStateName = (value: string): value is DataStateName =>
  (DATA_STATE_NAMES as readonly string[]).includes(value);

const fromDataStateVariant = (part: string): DataStateName | null =>
  DATA_STATE_NAMES.find((name) => DATA_STATE_VARIANTS[name] === part) ?? null;

const toDataStateVariant = (name: DataStateName): string =>
  DATA_STATE_VARIANTS[name];

const toDataStateAttribute = (name: DataStateName): DataStateAttribute => {
  const groups = DATA_STATE_PART.exec(DATA_STATE_VARIANTS[name])?.groups;

  return {
    name: `data-${groups?.["name"] ?? "state"}`,
    value: groups?.["value"] ?? "",
  };
};

const ARIA_STATE_NAMES = Object.keys(ARIA_STATE_VARIANTS) as AriaStateName[];

const isAriaStateName = (value: string): value is AriaStateName =>
  (ARIA_STATE_NAMES as readonly string[]).includes(value);

const fromAriaStateVariant = (part: string): AriaStateName | null =>
  ARIA_STATE_NAMES.find((name) => ARIA_STATE_VARIANTS[name] === part) ?? null;

const toAriaStateVariant = (name: AriaStateName): string =>
  ARIA_STATE_VARIANTS[name];

const isOtherStatePart = (part: string): boolean =>
  (part.startsWith("data-") || part.startsWith("aria-")) &&
  fromDataStateVariant(part) === null &&
  fromAriaStateVariant(part) === null;

const toStyleStateName = (name: string): StyleState | null => {
  if (name === "selected-item") {
    return "selected";
  }

  if (name === "disabled-item") {
    return "disabled";
  }

  return STYLE_STATES.find((state) => state === name) ?? null;
};

const DATA_STATE_STYLES: readonly DataStateStyle[] = [
  "active-item",
  "checked",
  "closed",
  "on",
  "open",
  "selected",
];

const isDataStateStyle = (state: StyleState): state is DataStateStyle =>
  (DATA_STATE_STYLES as readonly string[]).includes(state);

const GROUP_STATE_NAMES = Object.keys(GROUP_STATE_VARIANTS) as GroupStateName[];

const isGroupStateName = (value: string): value is GroupStateName =>
  (GROUP_STATE_NAMES as readonly string[]).includes(value);

const EDGE_STATE_NAMES: readonly EdgeStateName[] = [
  "first",
  "last",
  "odd",
  "even",
];

const isEdgeStateName = (value: string): value is EdgeStateName =>
  (EDGE_STATE_NAMES as readonly string[]).includes(value);

const toEdgePseudo = (name: EdgeStateName): string => EDGE_STATE_VARIANTS[name];

const toGroupVariant = (state: GroupStateName, name: string | null): string => {
  if (name === null) {
    return GROUP_STATE_VARIANTS[state];
  }

  return `${GROUP_STATE_VARIANTS[state]}/${name}`;
};

const isGroupName = (name: string): boolean =>
  name.length <= GROUP_NAME_MAX && GROUP_CLASS.test(`group/${name}`);

const fromGroupVariant = (part: string): GroupPart | null => {
  for (const state of GROUP_STATE_NAMES) {
    const base = GROUP_STATE_VARIANTS[state];

    if (part === base) {
      return { name: null, state };
    }

    const name = part.slice(base.length + 1);

    if (part.startsWith(`${base}/`) && isGroupName(name)) {
      return { name, state };
    }
  }

  return null;
};

const fromGroupClass = (token: string): GroupClass | null => {
  const hit = GROUP_CLASS.exec(token);

  if (hit === null) {
    return null;
  }

  return { name: hit.groups?.["name"] ?? null };
};

const toForcedParam = (forced: ForcedStateWire): string => {
  if (forced.selector === null) {
    return forced.state;
  }

  return `${forced.state}|${forced.selector}`;
};

const fromForcedParam = (raw: string | null): ForcedStateWire | null => {
  if (raw === null || raw === "") {
    return null;
  }

  const [head = "", ...rest] = raw.split("|");

  if (!isStyleState(head)) {
    return null;
  }

  const selector = rest.join("|");

  if (selector === "" || selector.length > STATE_SELECTOR_MAX) {
    return { selector: null, state: head };
  }

  return { selector, state: head };
};

const withForcedParam = (
  url: string,
  forced: ForcedStateWire | null
): string => {
  if (forced === null) {
    return url;
  }

  const next = new URL(url);
  next.searchParams.set(FORCE_STATE_PARAM, toForcedParam(forced));

  return next.toString();
};

export {
  ARIA_STATE_NAMES,
  ARIA_STATE_VARIANTS,
  fromAriaStateVariant,
  isAriaStateName,
  isOtherStatePart,
  toAriaStateVariant,
  DATA_STATE_NAMES,
  DATA_STATE_VARIANTS,
  EDGE_STATE_NAMES,
  EDGE_STATE_VARIANTS,
  FORCE_STATE_PARAM,
  fromDataStateVariant,
  fromGroupClass,
  fromGroupVariant,
  GROUP_STATE_NAMES,
  GROUP_STATE_VARIANTS,
  isGroupStateName,
  toGroupVariant,
  fromForcedParam,
  isDataStateName,
  isDataStateStyle,
  isEdgeStateName,
  isStyleState,
  STATE_SELECTOR_MAX,
  STYLE_STATES,
  toDataStateAttribute,
  toDataStateVariant,
  toEdgePseudo,
  toForcedParam,
  toStyleStateName,
  withForcedParam,
};

export type {
  AriaStateName,
  DataStateAttribute,
  DataStateName,
  DataStateStyle,
  EdgeStateName,
  ForcedFrameState,
  ForcedStateChange,
  ForcedStatePart,
  ForcedStateWire,
  GroupAncestor,
  GroupClass,
  GroupPart,
  GroupStateName,
  StateEdgeKind,
  StateLayer,
  StateListResult,
  StateOverride,
  StateStyleInput,
  StateStyleMode,
  StateStyleResult,
  StyleState,
};
