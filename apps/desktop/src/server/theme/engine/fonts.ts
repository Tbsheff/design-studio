import { toPick } from "./random.js";
import type { ThemeMood } from "./types.js";

interface FontOption {
  readonly mood: ThemeMood;
  readonly stack: string;
}

interface FontPair {
  readonly body: FontOption;
  readonly display: FontOption;
}

const SYSTEM_FONTS: readonly FontOption[] = [
  {
    mood: "serif",
    stack: "Georgia, 'Times New Roman', Times, serif",
  },
  {
    mood: "serif",
    stack: "ui-serif, Charter, 'Iowan Old Style', Georgia, serif",
  },
  {
    mood: "sans",
    stack: "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif",
  },
  {
    mood: "sans",
    stack: "'Helvetica Neue', Helvetica, Arial, sans-serif",
  },
  {
    mood: "sans",
    stack: "'Avenir Next', Avenir, 'Segoe UI', Arial, sans-serif",
  },
  {
    mood: "rounded",
    stack:
      "ui-rounded, 'SF Pro Rounded', 'Hiragino Maru Gothic ProN', system-ui, sans-serif",
  },
  {
    mood: "mono",
    stack: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
  },
];

const toProjectFonts = (stacks: readonly string[]): FontOption[] =>
  stacks.map((stack) => ({ mood: "project", stack }));

const toDisplayPool = (
  pool: readonly FontOption[],
  bias: ThemeMood | null
): readonly FontOption[] => {
  if (bias === null) {
    return pool;
  }

  const matched = pool.filter((option) => option.mood === bias);

  if (matched.length === 0) {
    return pool;
  }

  return matched;
};

const toBodyPool = (pool: readonly FontOption[]): readonly FontOption[] => {
  const bodies = pool.filter((option) => option.mood !== "mono");

  if (bodies.length === 0) {
    return pool;
  }

  return bodies;
};

const toFontPair = (
  random: () => number,
  stacks: readonly string[],
  bias: ThemeMood | null
): FontPair => {
  const pool = [...toProjectFonts(stacks), ...SYSTEM_FONTS];
  const [fallback = SYSTEM_FONTS[0] as FontOption] = pool;
  const display = toPick(random, toDisplayPool(pool, bias)) ?? fallback;
  const body = toPick(random, toBodyPool(pool)) ?? fallback;

  return { body, display };
};

export { toFontPair };

export type { FontOption, FontPair };
