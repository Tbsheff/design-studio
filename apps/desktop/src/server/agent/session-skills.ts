import type { PriorSession } from "./lifecycle.js";

const toUnshownSkills = (
  recommended: readonly string[],
  prior: PriorSession | null
): string[] => {
  const shown = new Set(prior?.skillIds);

  return recommended.filter((id) => !shown.has(id));
};

const toShownSkills = (
  prior: PriorSession | null,
  recommended: readonly string[]
): string[] => {
  const shown = new Set(prior?.skillIds);

  return [...shown, ...recommended.filter((id) => !shown.has(id))];
};

const toRunModelMs = (
  cumulativeApiMs: number,
  durationMs: number | null,
  prior: PriorSession | null
): number => {
  if (!prior) {
    return cumulativeApiMs;
  }

  if (prior.apiMs !== null) {
    return Math.max(0, cumulativeApiMs - prior.apiMs);
  }

  if (durationMs === null) {
    return cumulativeApiMs;
  }

  return Math.min(cumulativeApiMs, durationMs);
};

export { toRunModelMs, toShownSkills, toUnshownSkills };
