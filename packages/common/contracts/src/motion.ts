const MOTION_KINDS = ["transition", "entrance", "none"] as const;

type MotionKind = (typeof MOTION_KINDS)[number];

const ENTRANCE_PRESETS = [
  "fade",
  "slide-up",
  "slide-down",
  "scale-in",
  "blur-in",
] as const;

type EntrancePreset = (typeof ENTRANCE_PRESETS)[number];

const EASING_PRESETS = [
  "linear",
  "ease",
  "ease-in",
  "ease-out",
  "ease-in-out",
] as const;

type EasingPreset = (typeof EASING_PRESETS)[number];

const CUBIC_BEZIER = /^cubic-bezier\([-\d., ]{7,60}\)$/u;

const MOTION_PROPERTY = /^[a-z][a-z-]{0,39}$/u;
const MOTION_VALUE = /^[a-zA-Z0-9#.,%()\s+-]{1,120}$/u;

const MOTION_DURATION_MAX = 10_000;
const MOTION_DELAY_MAX = 10_000;
const MOTION_STAGGER_MAX = 2000;
const MOTION_PROPERTIES_MAX = 8;
const MOTION_STAGGER_CHILDREN = 12;

const MOTION_STATES = ["hover", "focus", "active"] as const;

type MotionState = (typeof MOTION_STATES)[number];

type MotionMode = "classes" | "css";

interface MotionTransition {
  delayMs: number;
  durationMs: number;
  easing: string;
  end: Record<string, string>;
  properties: string[];
  state: MotionState | null;
}

interface MotionEntrance {
  delayMs: number;
  durationMs: number;
  preset: EntrancePreset;
  staggerMs: number;
}

type MotionSpec =
  | ({ kind: "transition" } & MotionTransition)
  | ({ kind: "entrance" } & MotionEntrance)
  | { kind: "none" };

interface MotionInfo {
  animations: string[];
  classes: string[];
  file: string;
  marker: string | null;
  mode: MotionMode;
  reducedMotionGuard: boolean;
  rules: string[];
  transitions: string[];
}

interface MotionSetResult {
  classes: { add: string[]; remove: string[] } | null;
  files: string[];
  kind: MotionKind;
  mode: MotionMode;
  versionId: string | null;
}

export {
  CUBIC_BEZIER,
  EASING_PRESETS,
  ENTRANCE_PRESETS,
  MOTION_DELAY_MAX,
  MOTION_DURATION_MAX,
  MOTION_KINDS,
  MOTION_PROPERTIES_MAX,
  MOTION_PROPERTY,
  MOTION_STAGGER_CHILDREN,
  MOTION_STAGGER_MAX,
  MOTION_STATES,
  MOTION_VALUE,
};

export type {
  EasingPreset,
  EntrancePreset,
  MotionEntrance,
  MotionInfo,
  MotionKind,
  MotionMode,
  MotionSetResult,
  MotionSpec,
  MotionState,
  MotionTransition,
};
