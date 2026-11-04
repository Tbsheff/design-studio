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

const baseOf = (token: string): string => token.replace(MOTION_PREFIX, "");

const isTransitionClass = (token: string): boolean =>
  TRANSITION_BASE.test(baseOf(token)) ||
  STATE_END.test(token) ||
  token === "motion-reduce:transition-none";

const isEntranceClass = (token: string): boolean =>
  ENTRANCE_BASE.test(baseOf(token));

const isMarker = (token: string): boolean => MARKER.test(token);

const isMotionClass = (token: string): boolean =>
  isTransitionClass(token) || isEntranceClass(token) || isMarker(token);

const arbitrary = (value: string): string => value.replaceAll(/\s+/gu, "_");

const easingClass = (easing: string): string =>
  EASE_CLASS.get(easing) ?? `ease-[${arbitrary(easing.replaceAll(", ", ","))}]`;

const propertyClass = (properties: readonly string[]): string => {
  if (properties.length === 1 && properties[0] === "all") {
    return "transition-all";
  }

  return `transition-[${properties.join(",")}]`;
};

const stateVariant = (state: MotionState): string => {
  if (state === "focus") {
    return "focus-visible";
  }

  return state;
};

const endClasses = (transition: MotionTransition): string[] => {
  if (!transition.state) {
    return [];
  }

  const state = stateVariant(transition.state);

  return Object.entries(transition.end).map(
    ([prop, value]) => `${state}:[${prop}:${arbitrary(value)}]`
  );
};

const transitionClasses = (transition: MotionTransition): string[] => {
  const out = [
    `motion-safe:${propertyClass(transition.properties)}`,
    `motion-safe:duration-[${transition.durationMs}ms]`,
    `motion-safe:${easingClass(transition.easing)}`,
  ];

  if (transition.delayMs > 0) {
    out.push(`motion-safe:delay-[${transition.delayMs}ms]`);
  }

  out.push("motion-reduce:transition-none", ...endClasses(transition));

  return out;
};

const libEntranceClasses = (entrance: MotionEntrance): string[] | null => {
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

const keyframeEntranceClass = (entrance: MotionEntrance): string =>
  `motion-safe:animate-[${arbitrary(animationValue(entrance, entrance.delayMs))}]`;

const removeSet = (current: readonly string[], kind: MotionKind): string[] => {
  if (kind === "transition") {
    return current.filter((token) => isTransitionClass(token));
  }

  if (kind === "entrance") {
    return current.filter((token) => isEntranceClass(token) || isMarker(token));
  }

  return current.filter((token) => isMotionClass(token));
};

const diffClasses = (
  current: readonly string[],
  kind: MotionKind,
  add: readonly string[]
): ClassChanges => {
  const wanted = new Set(add);
  const remove = removeSet(current, kind).filter((token) => !wanted.has(token));
  const have = new Set(current);

  return { add: add.filter((token) => !have.has(token)), remove };
};

const isEmpty = (changes: ClassChanges): boolean =>
  changes.add.length === 0 && changes.remove.length === 0;

export {
  diffClasses,
  isEmpty,
  isEntranceClass,
  isMarker,
  isMotionClass,
  isTransitionClass,
  keyframeEntranceClass,
  libEntranceClasses,
  transitionClasses,
};

export type { ClassChanges };
