import {
  EASING_PRESETS,
  ENTRANCE_PRESETS,
  MOTION_STATES,
  parseVariant,
} from "./deps.js";
import type {
  EntrancePreset,
  MotionInfo,
  MotionKind,
  MotionSpecBody,
  MotionState,
} from "./deps.js";

interface MotionDraft {
  delayMs: number;
  durationMs: number;
  easing: string;
  kind: MotionKind;
  preset: EntrancePreset;
  staggerMs: number;
}

type Curve = readonly [number, number, number, number];

const TRANSITION_MS = 200;
const ENTRANCE_MS = 400;
const REPLAY_GAP_MS = 40;
const REPLAY_TAIL_MS = 300;
const STAGGER_SHOWN = 4;
const LINEAR: Curve = [0, 0, 1, 1];

const EMPTY_DRAFT: MotionDraft = {
  delayMs: 0,
  durationMs: TRANSITION_MS,
  easing: "ease-out",
  kind: "none",
  preset: "fade",
  staggerMs: 0,
};

const CURVES = new Map([
  ["ease", "cubic-bezier(0.25,0.1,0.25,1)"],
  ["ease-in", "cubic-bezier(0.42,0,1,1)"],
  ["ease-in-out", "cubic-bezier(0.42,0,0.58,1)"],
  ["ease-out", "cubic-bezier(0,0,0.58,1)"],
  ["linear", "cubic-bezier(0,0,1,1)"],
]);

const PRESET_HINTS: [RegExp, EntrancePreset][] = [
  [/slide-in-from-bottom|slide-up/u, "slide-up"],
  [/slide-in-from-top|slide-down/u, "slide-down"],
  [/zoom-in|scale-in/u, "scale-in"],
  [/blur-in/u, "blur-in"],
];

const DURATION =
  /(?:duration-\[|duration:\s*|animation-duration:)(?<ms>\d+)ms/u;

const DELAY = /(?:delay-\[|delay:\s*|animation-delay:)(?<ms>\d+)ms/u;
const STAGGER = /nth-child[^{]*\{[^}]*delay:\s*(?<ms>\d+)ms/u;
const BEZIER = /cubic-bezier\([-\d.,\s]+\)/u;

const firstNumber = (
  pattern: RegExp,
  text: string,
  fallback: number
): number => {
  const found = Number(pattern.exec(text)?.groups?.["ms"] ?? Number.NaN);

  if (Number.isNaN(found)) {
    return fallback;
  }

  return found;
};

const kindOf = (info: MotionInfo): MotionKind => {
  if (info.animations.length > 0) {
    return "entrance";
  }

  if (info.transitions.length > 0) {
    return "transition";
  }

  return "none";
};

const presetOf = (text: string): EntrancePreset => {
  const hit = PRESET_HINTS.find(([pattern]) => pattern.test(text));

  return hit?.[1] ?? "fade";
};

const easingOf = (text: string): string => {
  const bezier = BEZIER.exec(text.replaceAll("_", " "));

  if (bezier) {
    return bezier[0].replaceAll(" ", "");
  }

  const named = [...EASING_PRESETS]
    .toSorted((left, right) => right.length - left.length)
    .find((name) => text.includes(name));

  return named ?? "ease-out";
};

const baseMs = (kind: MotionKind): number => {
  if (kind === "entrance") {
    return ENTRANCE_MS;
  }

  return TRANSITION_MS;
};

const draftOf = (info: MotionInfo | null): MotionDraft => {
  if (!info) {
    return EMPTY_DRAFT;
  }

  const text = [...info.classes, ...info.rules].join(" ");
  const found = kindOf(info);
  const duration = firstNumber(DURATION, text, baseMs(found));

  return {
    delayMs: firstNumber(DELAY, text, 0),
    durationMs: duration,
    easing: easingOf(text),
    kind: found,
    preset: presetOf(text),
    staggerMs: firstNumber(STAGGER, text, 0),
  };
};

const withKind = (draft: MotionDraft, kind: MotionKind): MotionDraft => {
  if (kind === draft.kind) {
    return draft;
  }

  return { ...draft, durationMs: baseMs(kind), kind };
};

const MOTION_STATE_NAMES: readonly string[] = MOTION_STATES;

const isMotionState = (state: string): state is MotionState =>
  MOTION_STATE_NAMES.includes(state);

const stateOf = (variant: string): MotionState | null => {
  const names: readonly string[] = parseVariant(variant)?.states ?? [];

  return names.find((name): name is MotionState => isMotionState(name)) ?? null;
};

const transitionBody = (
  draft: MotionDraft,
  state: MotionState | null
): MotionSpecBody => {
  const body: MotionSpecBody = {
    delayMs: draft.delayMs,
    durationMs: draft.durationMs,
    easing: draft.easing,
    kind: "transition",
    properties: ["opacity", "transform"],
  };

  if (state) {
    body.properties = ["all"];
    body.state = state;
  }

  return body;
};

const entranceBody = (
  draft: MotionDraft,
  hasChildren: boolean
): MotionSpecBody => {
  const body: MotionSpecBody = {
    delayMs: draft.delayMs,
    durationMs: draft.durationMs,
    kind: "entrance",
    preset: draft.preset,
    staggerMs: 0,
  };

  if (hasChildren) {
    body.staggerMs = draft.staggerMs;
  }

  return body;
};

const specBody = (
  draft: MotionDraft,
  state: MotionState | null,
  hasChildren: boolean
): MotionSpecBody => {
  if (draft.kind === "entrance") {
    return entranceBody(draft, hasChildren);
  }

  if (draft.kind === "transition") {
    return transitionBody(draft, state);
  }

  return { kind: "none" };
};

const curveOf = (easing: string): Curve => {
  const bezier = CURVES.get(easing) ?? easing;

  if (!BEZIER.test(bezier)) {
    return LINEAR;
  }

  const parts = bezier
    .slice(bezier.indexOf("(") + 1, -1)
    .split(",")
    .map(Number);

  const [x1 = 0, y1 = 0, x2 = 1, y2 = 1] = parts;

  return [x1, y1, x2, y2];
};

const childCount = (outerHTML: string): number => {
  if (typeof DOMParser === "undefined" || outerHTML === "") {
    return 0;
  }

  const doc = new DOMParser().parseFromString(outerHTML, "text/html");

  return doc.body.firstElementChild?.childElementCount ?? 0;
};

const replayMs = (draft: MotionDraft): number =>
  draft.durationMs +
  draft.delayMs +
  draft.staggerMs * STAGGER_SHOWN +
  REPLAY_TAIL_MS;

const isPreset = (value: string): value is EntrancePreset =>
  (ENTRANCE_PRESETS as readonly string[]).includes(value);

export {
  childCount,
  curveOf,
  draftOf,
  isPreset,
  REPLAY_GAP_MS,
  replayMs,
  specBody,
  stateOf,
  withKind,
};

export type { Curve, MotionDraft };
