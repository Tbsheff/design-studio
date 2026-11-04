import {
  isEntranceClass,
  isMotionClass,
  isTransitionClass,
} from "./classes.js";
import { markerRules } from "./css.js";
import type { MotionInfo, SourceLoc } from "./deps.js";
import { cssEntry } from "./files.js";
import { loadSite } from "./site.js";
import type { MotionScope, MotionSite } from "./site.js";

const GUARD = /^motion-(?:safe|reduce):/u;

const sheetRules = async (
  scope: MotionScope,
  site: MotionSite
): Promise<string[]> => {
  if (!site.marker) {
    return [];
  }

  if (site.html) {
    return markerRules(site.original, site.marker);
  }

  const entry = await cssEntry(scope.workTree);

  if (!entry) {
    return [];
  }

  return markerRules(entry.text, site.marker);
};

const hasGuard = (
  classes: readonly string[],
  rules: readonly string[]
): boolean =>
  classes.some((token) => GUARD.test(token)) ||
  rules.some((rule) => rule.includes("prefers-reduced-motion"));

const listMotion = async (
  scope: MotionScope,
  loc: SourceLoc
): Promise<MotionInfo> => {
  const site = await loadSite(scope, loc);
  const motionClasses = site.classes.filter((token) => isMotionClass(token));
  const sheet = await sheetRules(scope, site);

  return {
    animations: [
      ...motionClasses.filter((token) => isEntranceClass(token)),
      ...sheet.filter((rule) => rule.includes("animation")),
    ],
    classes: motionClasses,
    file: site.relative,
    marker: site.marker,
    mode: site.mode,
    reducedMotionGuard: hasGuard(motionClasses, sheet),
    rules: sheet,
    transitions: [
      ...motionClasses.filter((token) => isTransitionClass(token)),
      ...sheet.filter((rule) => rule.includes("transition")),
    ],
  };
};

export { listMotion };
