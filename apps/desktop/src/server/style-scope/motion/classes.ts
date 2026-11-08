import { animationValue } from "./css.js";
import type {
  EntrancePreset,
  MotionEntrance,
  MotionKind,
  MotionState,
  MotionTransition,
} from "./deps.js";

interface ClassChanges {
  add: string[];
  remove: string[];
}

const MOTION_PREFIX = /^(?:motion-safe:|motion-reduce:)/u;

const TRANSITION_BASE = /^(?:transition(?:-|$)|duration-|ease-|delay-)/u;

const ENTRANCE_BASE =
  /^(?:animate-|fade-in|slide-in-|zoom-in|blur-in|\[animation-)/u;

const STATE_END = /^(?:hover|focus|focus-visible|active):\[[a-z-]+:/u;

const MARKER = /^studio-mo-[a-z0-9]{8}$/u;

const EASE_CLASS = new Map<string, string>([
  ["ease-in", "ease-in"],
  ["ease-in-out", "ease-in-out"],
  ["ease-out", "ease-out"],
  ["linear", "ease-linear"],
]);

const LIB_PRESET = new Map<EntrancePreset, string[]>([
  ["fade", ["fade-in"]],
  ["scale-in", ["fade-in", "zoom-in-95"]],
  ["slide-down", ["fade-in", "slide-in-from-top-4"]],
  ["slide-up", ["fade-in", "slide-in-from-bottom-4"]],
]);

const toBaseOf = (token: string): string => token.replace(MOTION_PREFIX, "");

const isTransitionClass = (token: string): boolean =>
  TRANSITION_BASE.test(toBaseOf(token)) ||
  STATE_END.test(token) ||
  token === "motion-reduce:transition-none";

const isEntranceClass = (token: string): boolean =>
  ENTRANCE_BASE.test(toBaseOf(token));

const isMarker = (token: string): boolean => MARKER.test(token);

const isMotionClass = (token: string): boolean =>
  isTransitionClass(token) || isEntranceClass(token) || isMarker(token);

const toArbitrary = (value: string): string => value.replaceAll(/\s+/gu, "_");

const toEasingClass = (easing: string): string =>
  EASE_CLASS.get(easing) ??
  `ease-[${toArbitrary(easing.replaceAll(", ", ","))}]`;

const toPropertyClass = (properties: readonly string[]): string => {
  if (properties.length === 1 && properties[0] === "all") {
    return "transition-all";
  }

  return `transition-[${properties.join(",")}]`;
};

const toStateVariant = (state: MotionState): string => {
  if (state === "focus") {
    return "focus-visible";
  }

  return state;
};

const toEndClasses = (transition: MotionTransition): string[] => {
  if (!transition.state) {
    return [];
  }

  const state = toStateVariant(transition.state);

  return Object.entries(transition.end).map(
    ([prop, value]) => `${state}:[${prop}:${toArbitrary(value)}]`
  );
};

const toTransitionClasses = (transition: MotionTransition): string[] => {
  const out = [
    `motion-safe:${toPropertyClass(transition.properties)}`,
    `motion-safe:duration-[${transition.durationMs}ms]`,
    `motion-safe:${toEasingClass(transition.easing)}`,
  ];

  if (transition.delayMs > 0) {
    out.push(`motion-safe:delay-[${transition.delayMs}ms]`);
  }

  out.push("motion-reduce:transition-none", ...toEndClasses(transition));

  return out;
};

const toLibEntranceClasses = (entrance: MotionEntrance): string[] | null => {
  const preset = LIB_PRESET.get(entrance.preset);

  if (!preset || entrance.staggerMs > 0) {
    return null;
  }

  const out = [
    "motion-safe:animate-in",
    ...preset.map((name) => `motion-safe:${name}`),
    `motion-safe:[animation-duration:${entrance.durationMs}ms]`,
  ];

  if (entrance.delayMs > 0) {
    out.push(`motion-safe:[animation-delay:${entrance.delayMs}ms]`);
  }

  return out;
};

const toKeyframeEntranceClass = (entrance: MotionEntrance): string =>
  `motion-safe:animate-[${toArbitrary(animationValue(entrance, entrance.delayMs))}]`;

const toRemoveSet = (
  current: readonly string[],
  kind: MotionKind
): string[] => {
  if (kind === "transition") {
    return current.filter((token) => isTransitionClass(token));
  }

  if (kind === "entrance") {
    return current.filter((token) => isEntranceClass(token) || isMarker(token));
  }

  return current.filter((token) => isMotionClass(token));
};

const toDiffClasses = (
  current: readonly string[],
  kind: MotionKind,
  add: readonly string[]
): ClassChanges => {
  const wanted = new Set(add);

  const remove = toRemoveSet(current, kind).filter(
    (token) => !wanted.has(token)
  );

  const have = new Set(current);

  return { add: add.filter((token) => !have.has(token)), remove };
};

const isEmpty = (changes: ClassChanges): boolean =>
  changes.add.length === 0 && changes.remove.length === 0;

export {
  toDiffClasses as diffClasses,
  isEmpty,
  isEntranceClass,
  isMarker,
  isMotionClass,
  isTransitionClass,
  toKeyframeEntranceClass as keyframeEntranceClass,
  toLibEntranceClasses as libEntranceClasses,
  toTransitionClasses as transitionClasses,
};

export type { ClassChanges };
