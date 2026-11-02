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

const tokenName = (cssVar: string): string =>
  cssVar.replace(/^--/u, "").replace(/^color-/u, "");

const varCandidates = (raw: string): Set<string> => {
  const bare = raw.replace(/^--/u, "").replace(/^color\./u, "");

  return new Set([`--${bare}`, `--color-${bare}`, raw]);
};

const colorEntries = (
  entries: readonly CompiledTokenEntry[]
): CompiledTokenEntry[] => entries.filter((entry) => entry.type === "color");

const findToken = (
  entries: readonly CompiledTokenEntry[],
  raw: string
): CompiledTokenEntry | null => {
  const pool = colorEntries(entries);
  const names = varCandidates(raw.trim());

  return (
    pool.find((entry) => names.has(entry.cssVar)) ??
    pool.find(
      (entry) => entry.path === raw || entry.path.endsWith(`.${raw}`)
    ) ??
    null
  );
};

const tokenPaint = (cssVar: string): FillPaint => ({
  color: `var(${cssVar})`,
  token: tokenName(cssVar),
});

const fromToken = (
  entries: readonly CompiledTokenEntry[],
  raw: string,
  themeNames: ReadonlySet<string>
): FillPaint => {
  const entry = findToken(entries, raw);

  if (entry) {
    return tokenPaint(entry.cssVar);
  }

  const bare = tokenName(raw.trim());

  if (themeNames.has(bare)) {
    return tokenPaint(`--color-${bare}`);
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
    return tokenPaint(direct);
  }

  const [best] = matchColor(color, [...entries]);

  if (best && best.distance <= EXACT_DELTA) {
    return tokenPaint(best.cssVar);
  }

  return { color, token: null };
};

const paintOf = (
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

export { paintOf, tokenName, tokenPaint, VAR_REF };

export type { PaintInput };
