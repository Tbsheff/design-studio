import { lengthToPx } from "./deps.js";
import type {
  CompiledTokenEntry,
  SpacingInput,
  TailwindTheme,
} from "./deps.js";
import { SpacingError } from "./errors.js";
import type { SpacingSite } from "./site.js";

interface SpacingCss {
  readonly css: string;
  readonly token: string | null;
}

interface Candidate {
  readonly css: string;
  readonly px: number;
  readonly token: string | null;
}

const SCALE_STEP = /^\d+(?:\.\d+)?$/u;

const bareName = (raw: string): string =>
  raw
    .trim()
    .replace(/^--/u, "")
    .replace(/^spacing[-.]/u, "");

const PX_DIGITS = 4;

const pxText = (px: number): string => `${Number(px.toFixed(PX_DIGITS))}px`;

const spacingEntries = (
  entries: readonly CompiledTokenEntry[]
): CompiledTokenEntry[] =>
  entries.filter(
    (entry) => entry.type === "dimension" && lengthToPx(entry.value) !== null
  );

const themeToken = (theme: TailwindTheme, raw: string): SpacingCss | null => {
  const name = bareName(raw);

  if (SCALE_STEP.test(name)) {
    return { css: pxText(Number(name) * theme.spacingPx), token: name };
  }

  const cssVar = `--spacing-${name}`;
  const hit = theme.vars.get(cssVar);

  if (hit && hit.ns === "spacing") {
    return { css: `var(${cssVar})`, token: hit.name };
  }

  return null;
};

const entryToken = (
  entries: readonly CompiledTokenEntry[],
  raw: string
): SpacingCss | null => {
  const text = raw.trim();

  const names = new Set([
    text,
    `--${bareName(text)}`,
    `--spacing-${bareName(text)}`,
  ]);

  const entry =
    spacingEntries(entries).find((item) => names.has(item.cssVar)) ??
    spacingEntries(entries).find(
      (item) => item.path === text || item.path.endsWith(`.${bareName(text)}`)
    );

  if (!entry) {
    return null;
  }

  return { css: `var(${entry.cssVar})`, token: entry.path };
};

const fromToken = (site: SpacingSite, raw: string): SpacingCss => {
  const hit =
    (site.theme && site.mode === "classes" && themeToken(site.theme, raw)) ||
    entryToken(site.entries, raw);

  if (!hit) {
    throw new SpacingError(
      `No spacing token ${raw}. Pass a px value or a token from the project theme.`
    );
  }

  return hit;
};

const scaleCandidate = (theme: TailwindTheme, px: number): Candidate => {
  const step = Math.round(Math.abs(px) / theme.spacingPx);
  const sign = Math.sign(px) || 1;

  return {
    css: pxText(sign * step * theme.spacingPx),
    px: sign * step * theme.spacingPx,
    token: String(step),
  };
};

const themeCandidates = (theme: TailwindTheme, px: number): Candidate[] => [
  scaleCandidate(theme, px),
  ...[...theme.spacing].map(([name, size]) => ({
    css: `var(--spacing-${name})`,
    px: size,
    token: name,
  })),
];

const entryCandidates = (entries: readonly CompiledTokenEntry[]): Candidate[] =>
  spacingEntries(entries).map((entry) => ({
    css: `var(${entry.cssVar})`,
    px: lengthToPx(entry.value) ?? 0,
    token: entry.path,
  }));

const candidatesOf = (site: SpacingSite, px: number): Candidate[] => {
  if (site.theme && site.mode === "classes") {
    return themeCandidates(site.theme, px);
  }

  return entryCandidates(site.entries);
};

const nearest = (pool: readonly Candidate[], px: number): Candidate | null => {
  let best: Candidate | null = null;

  for (const item of pool) {
    if (!best || Math.abs(item.px - px) < Math.abs(best.px - px)) {
      best = item;
    }
  }

  return best;
};

const fromPx = (site: SpacingSite, px: number, snap: boolean): SpacingCss => {
  if (!snap) {
    return { css: pxText(px), token: null };
  }

  const hit = nearest(candidatesOf(site, px), px);

  if (!hit) {
    return { css: pxText(px), token: null };
  }

  return { css: hit.css, token: hit.token };
};

const checkSign = (input: SpacingInput): void => {
  if (input.value !== null && input.value < 0 && input.property !== "margin") {
    throw new SpacingError("Only margin takes a negative value.");
  }
};

const spacingCssOf = (site: SpacingSite, input: SpacingInput): SpacingCss => {
  checkSign(input);

  if ((input.token === null) === (input.value === null)) {
    throw new SpacingError("Pass value (px) or token, not both.");
  }

  if (input.token !== null) {
    return fromToken(site, input.token);
  }

  return fromPx(site, input.value ?? 0, input.snap);
};

export { spacingCssOf };

export type { SpacingCss };
