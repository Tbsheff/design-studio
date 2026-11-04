import { deltaE, parseColor } from "./color.js";
import { lengthPx } from "./length.js";
import type { Candidate, SweepToken } from "./types.js";

interface Limits {
  readonly color: number;
  readonly px: number;
}

interface Match {
  readonly distance: number;
  readonly exact: boolean;
  readonly replacement: string;
  readonly token: string;
}

interface Leftover {
  readonly nearest: string | null;
}

type Outcome = { readonly match: Match } | { readonly leftover: Leftover };

interface Nearest {
  readonly distance: number;
  readonly token: SweepToken;
}

interface StepFit {
  readonly distance: number;
  readonly step: number;
}

const DEFAULT_LIMITS: Limits = { color: 6, px: 1 };
const SCALE_UNIT = 4;
const EXACT_EPSILON = 0.01;

const SCALE_STEPS =
  "0.5 1 1.5 2 2.5 3 3.5 4 5 6 7 8 9 10 11 12 14 16 20 24 28 32 36 40 44 48 52 56 60 64 72 80 96"
    .split(" ")
    .map(Number);

const signOf = (candidate: Candidate): string => {
  if (candidate.negative) {
    return "-";
  }

  return "";
};

const classText = (
  candidate: Candidate,
  token: SweepToken | null,
  suffix: string
): string => {
  const sign = signOf(candidate);

  if (token !== null && token.suffix === null) {
    return `${sign}${candidate.prefix}-[var(${token.cssVar})]`;
  }

  return `${sign}${candidate.prefix}-${suffix}`;
};

const replacementOf = (
  candidate: Candidate,
  token: SweepToken
): string | null => {
  if (candidate.form === "css") {
    return `var(${token.cssVar})`;
  }

  if (token.suffix === null && candidate.kind !== "color") {
    return null;
  }

  if (candidate.kind === "font") {
    return `text-${token.suffix ?? ""}`;
  }

  return classText(candidate, token, token.suffix ?? "");
};

const closer = (best: Nearest | null, next: Nearest): Nearest => {
  if (best === null || next.distance < best.distance) {
    return next;
  }

  return best;
};

const nearestColor = (
  candidate: Candidate,
  tokens: readonly SweepToken[]
): Nearest | null => {
  const parsed = parseColor(candidate.value);

  if (parsed === null || parsed.alpha < 1) {
    return null;
  }

  let best: Nearest | null = null;

  for (const token of tokens) {
    if (token.kind === "color" && token.rgb !== null) {
      best = closer(best, { distance: deltaE(parsed.rgb, token.rgb), token });
    }
  }

  return best;
};

const isUsable = (candidate: Candidate, token: SweepToken): boolean =>
  token.kind === candidate.kind &&
  token.px !== null &&
  (candidate.form === "css" || token.suffix !== null);

const nearestLength = (
  candidate: Candidate,
  tokens: readonly SweepToken[]
): Nearest | null => {
  const px = lengthPx(candidate.value);

  if (px === null) {
    return null;
  }

  let best: Nearest | null = null;

  for (const token of tokens) {
    if (isUsable(candidate, token)) {
      best = closer(best, { distance: Math.abs((token.px ?? 0) - px), token });
    }
  }

  return best;
};

const nearestStep = (px: number): StepFit => {
  let bestStep = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const step of SCALE_STEPS) {
    const distance = Math.abs(step * SCALE_UNIT - px);

    if (distance < bestDistance) {
      bestDistance = distance;
      bestStep = step;
    }
  }

  return { distance: bestDistance, step: bestStep };
};

const scaleMatch = (candidate: Candidate, limits: Limits): Match | null => {
  const px = lengthPx(candidate.value);

  if (
    px === null ||
    candidate.form !== "class" ||
    candidate.kind !== "spacing"
  ) {
    return null;
  }

  const { distance, step } = nearestStep(px);

  if (distance > limits.px) {
    return null;
  }

  return {
    distance,
    exact: distance < EXACT_EPSILON,
    replacement: classText(candidate, null, String(step)),
    token: `spacing ${step}`,
  };
};

const toMatch = (
  candidate: Candidate,
  best: Nearest | null,
  limit: number
): Match | null => {
  if (best === null || best.distance > limit) {
    return null;
  }

  const rewrite = replacementOf(candidate, best.token);

  if (rewrite === null) {
    return null;
  }

  return {
    distance: best.distance,
    exact: best.distance < EXACT_EPSILON,
    replacement: rewrite,
    token: best.token.cssVar,
  };
};

const matchCandidate = (
  candidate: Candidate,
  tokens: readonly SweepToken[],
  limits: Limits = DEFAULT_LIMITS
): Outcome => {
  const isColor = candidate.kind === "color";
  let best = nearestLength(candidate, tokens);
  let limit = limits.px;

  if (isColor) {
    best = nearestColor(candidate, tokens);
    limit = limits.color;
  }

  const match = toMatch(candidate, best, limit);

  if (match !== null) {
    return { match };
  }

  const scaled = scaleMatch(candidate, limits);

  if (scaled !== null) {
    return { match: scaled };
  }

  return { leftover: { nearest: best?.token.cssVar ?? null } };
};

export { DEFAULT_LIMITS, matchCandidate };

export type { Limits, Match, Outcome };
