const STYLE_STATES = [
  "hover",
  "focus-visible",
  "active",
  "disabled",
  "dark",
] as const;

const FORCE_STATE_PARAM = "__studio_force";

const STATE_SELECTOR_MAX = 2000;

type StyleState = (typeof STYLE_STATES)[number];

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
  FORCE_STATE_PARAM,
  fromForcedParam,
  isStyleState,
  STATE_SELECTOR_MAX,
  STYLE_STATES,
  toForcedParam,
  withForcedParam,
};

export type {
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
