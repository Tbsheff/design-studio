import { COLOR_SNAP_DELTA, matchColor } from "./deps.js";
import type { CompiledTokenEntry, FillPaint } from "./deps.js";
import { FillError } from "./errors.js";

interface PaintInput {
  color?: string | undefined;
  token?: string | undefined;
}

const EXACT_RATIO = 10;

const EXACT_DELTA = COLOR_SNAP_DELTA / EXACT_RATIO;

const VAR_REF = /^var\(\s*(?<name>--[a-zA-Z0-9_-]+)\s*(?:,[^)]*)?\)$/u;

const toTokenName = (cssVar: string): string =>
  cssVar.replace(/^--/u, "").replace(/^color-/u, "");

const toVarCandidates = (raw: string): Set<string> => {
  const bare = raw.replace(/^--/u, "").replace(/^color\./u, "");

  return new Set([`--${bare}`, `--color-${bare}`, raw]);
};

const toColorEntries = (
  entries: readonly CompiledTokenEntry[]
): CompiledTokenEntry[] => entries.filter((entry) => entry.type === "color");

const toFindToken = (
  entries: readonly CompiledTokenEntry[],
  raw: string
): CompiledTokenEntry | null => {
  const pool = toColorEntries(entries);
  const names = toVarCandidates(raw.trim());

  return (
    pool.find((entry) => names.has(entry.cssVar)) ??
    pool.find(
      (entry) => entry.path === raw || entry.path.endsWith(`.${raw}`)
    ) ??
    null
  );
};

const toTokenPaint = (cssVar: string): FillPaint => ({
  color: `var(${cssVar})`,
  token: toTokenName(cssVar),
});

const fromToken = (
  entries: readonly CompiledTokenEntry[],
  raw: string,
  themeNames: ReadonlySet<string>
): FillPaint => {
  const entry = toFindToken(entries, raw);

  if (entry) {
    return toTokenPaint(entry.cssVar);
  }

  const bare = toTokenName(raw.trim());

  if (themeNames.has(bare)) {
    return toTokenPaint(`--color-${bare}`);
  }

  throw new FillError(`No color token named ${raw} in this project.`);
};

const fromColor = (
  entries: readonly CompiledTokenEntry[],
  raw: string
): FillPaint => {
  const color = raw.trim();
  const direct = VAR_REF.exec(color)?.groups?.["name"];

  if (direct) {
    return toTokenPaint(direct);
  }

  const [best] = matchColor(color, [...entries]);

  if (best && best.distance <= EXACT_DELTA) {
    return toTokenPaint(best.cssVar);
  }

  return { color, token: null };
};

const toPaintOf = (
  entries: readonly CompiledTokenEntry[],
  input: PaintInput,
  themeNames: ReadonlySet<string>
): FillPaint => {
  if (input.token) {
    return fromToken(entries, input.token, themeNames);
  }

  if (input.color) {
    return fromColor(entries, input.color);
  }

  throw new FillError("Each paint needs a color or a token.");
};

export {
  toPaintOf as paintOf,
  toTokenName as tokenName,
  toTokenPaint as tokenPaint,
  VAR_REF,
};

export type { PaintInput };
