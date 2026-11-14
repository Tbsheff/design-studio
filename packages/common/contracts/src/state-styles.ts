const STYLE_STATES = [
  "hover",
  "focus-visible",
  "active",
  "disabled",
  "dark",
  "open",
  "checked",
  "selected",
] as const;

const DATA_STATE_VARIANTS = {
  checked: "data-[state=checked]",
  open: "data-[state=open]",
  selected: "data-[state=active]",
  "selected-item": "data-[state=selected]",
} as const;

const FORCE_STATE_PARAM = "__studio_force";

const STATE_SELECTOR_MAX = 2000;

type StyleState = (typeof STYLE_STATES)[number];

type DataStateName = keyof typeof DATA_STATE_VARIANTS;

type DataStateStyle = "checked" | "open" | "selected";

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

interface StateListResult {
  readonly forced: readonly ForcedFrameState[];
  readonly layer: StateLayer;
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

const toDataStateValue = (name: DataStateName): string =>
  DATA_STATE_VARIANTS[name].slice("data-[state=".length, -1);

const toStyleStateName = (name: string): StyleState | null => {
  if (name === "selected-item") {
    return "selected";
  }

  return STYLE_STATES.find((state) => state === name) ?? null;
};

const isDataStateStyle = (state: StyleState): state is DataStateStyle =>
  state === "open" || state === "checked" || state === "selected";

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
  DATA_STATE_NAMES,
  DATA_STATE_VARIANTS,
  FORCE_STATE_PARAM,
  fromDataStateVariant,
  fromForcedParam,
  isDataStateName,
  isDataStateStyle,
  isStyleState,
  STATE_SELECTOR_MAX,
  STYLE_STATES,
  toDataStateValue,
  toDataStateVariant,
  toForcedParam,
  toStyleStateName,
  withForcedParam,
};

export type {
  DataStateName,
  DataStateStyle,
  ForcedFrameState,
  ForcedStateWire,
  StateLayer,
  StateListResult,
  StateOverride,
  StateStyleInput,
  StateStyleMode,
  StateStyleResult,
  StyleState,
};
