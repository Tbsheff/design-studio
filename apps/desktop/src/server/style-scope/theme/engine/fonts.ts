import { toPick } from "./random.js";
import type { ThemeMood } from "./types.js";

interface FontOption {
  readonly family: string | null;
  readonly mood: ThemeMood;
  readonly stack: string;
}

interface FontPair {
  readonly body: FontOption;
  readonly display: FontOption;
}

interface WebFont {
  readonly axes: string | null;
  readonly fallback: string;
  readonly family: string;
}

interface WebPair {
  readonly body: WebFont;
  readonly display: WebFont;
  readonly mood: ThemeMood;
}

const SERIF_FALLBACK = "Georgia, 'Times New Roman', serif";

const SANS_FALLBACK = "system-ui, -apple-system, 'Segoe UI', Arial, sans-serif";

const ROUNDED_FALLBACK = "ui-rounded, system-ui, sans-serif";

const MONO_FALLBACK = "ui-monospace, 'SF Mono', Menlo, monospace";

const FULL_AXES = "wght@400;500;600;700";

const FONTS_BASE = "https://fonts.googleapis.com/css2";

const toWebFont = (
  family: string,
  fallback: string,
  axes: string | null
): WebFont => ({ axes, fallback, family });

const toSans = (family: string): WebFont =>
  toWebFont(family, SANS_FALLBACK, FULL_AXES);

const WEB_PAIRS: readonly WebPair[] = [
  {
    body: toSans("Inter"),
    display: toWebFont("Fraunces", SERIF_FALLBACK, "wght@400;600;700"),
    mood: "serif",
  },
  {
    body: toSans("Geist"),
    display: toWebFont("Instrument Serif", SERIF_FALLBACK, null),
    mood: "serif",
  },
  {
    body: toSans("DM Sans"),
    display: toWebFont("DM Serif Display", SERIF_FALLBACK, null),
    mood: "serif",
  },
  {
    body: toSans("Source Sans 3"),
    display: toWebFont("Playfair Display", SERIF_FALLBACK, "wght@400;600;700"),
    mood: "serif",
  },
  {
    body: toSans("Manrope"),
    display: toWebFont("Cormorant Garamond", SERIF_FALLBACK, FULL_AXES),
    mood: "serif",
  },
  {
    body: toSans("Work Sans"),
    display: toWebFont("Libre Baskerville", SERIF_FALLBACK, "wght@400;700"),
    mood: "serif",
  },
  { body: toSans("Inter"), display: toSans("Space Grotesk"), mood: "sans" },
  { body: toSans("Inter"), display: toSans("Sora"), mood: "sans" },
  {
    body: toSans("DM Sans"),
    display: toSans("Plus Jakarta Sans"),
    mood: "sans",
  },
  { body: toSans("Work Sans"), display: toSans("Outfit"), mood: "sans" },
  {
    body: toWebFont("Nunito", ROUNDED_FALLBACK, FULL_AXES),
    display: toWebFont("Fredoka", ROUNDED_FALLBACK, FULL_AXES),
    mood: "rounded",
  },
  {
    body: toWebFont("Nunito", ROUNDED_FALLBACK, FULL_AXES),
    display: toWebFont("Quicksand", ROUNDED_FALLBACK, FULL_AXES),
    mood: "rounded",
  },
  {
    body: toSans("Inter"),
    display: toWebFont("JetBrains Mono", MONO_FALLBACK, FULL_AXES),
    mood: "mono",
  },
  {
    body: toSans("IBM Plex Sans"),
    display: toWebFont("IBM Plex Mono", MONO_FALLBACK, FULL_AXES),
    mood: "mono",
  },
];

const SYSTEM_FONTS: readonly FontOption[] = [
  {
    family: null,
    mood: "serif",
    stack: "Georgia, 'Times New Roman', Times, serif",
  },
  {
    family: null,
    mood: "serif",
    stack: "ui-serif, Charter, 'Iowan Old Style', Georgia, serif",
  },
  {
    family: null,
    mood: "sans",
    stack: "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif",
  },
  {
    family: null,
    mood: "sans",
    stack: "'Helvetica Neue', Helvetica, Arial, sans-serif",
  },
  {
    family: null,
    mood: "sans",
    stack: "'Avenir Next', Avenir, 'Segoe UI', Arial, sans-serif",
  },
  {
    family: null,
    mood: "rounded",
    stack:
      "ui-rounded, 'SF Pro Rounded', 'Hiragino Maru Gothic ProN', system-ui, sans-serif",
  },
  {
    family: null,
    mood: "mono",
    stack: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
  },
];

const toProjectFonts = (stacks: readonly string[]): FontOption[] =>
  stacks.map((stack) => ({ family: null, mood: "project", stack }));

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

const toWebOption = (font: WebFont, pairMood: ThemeMood): FontOption => ({
  family: font.family,
  mood: pairMood,
  stack: `'${font.family}', ${font.fallback}`,
});

const toWebFontPair = (pair: WebPair): FontPair => ({
  body: toWebOption(pair.body, pair.mood),
  display: toWebOption(pair.display, pair.mood),
});

const isSameFamily = (left: string, right: string): boolean =>
  left.trim().toLowerCase() === right.trim().toLowerCase();

const isPairLinked = (pair: WebPair, linked: readonly string[]): boolean =>
  [pair.display.family, pair.body.family].every((family) =>
    linked.some((name) => isSameFamily(name, family))
  );

const toShuffled = <Item>(
  random: () => number,
  items: readonly Item[]
): Item[] => {
  const rest = [...items];
  const shuffled: Item[] = [];

  while (rest.length > 0) {
    const at = Math.floor(random() * rest.length);
    shuffled.push(...rest.splice(at, 1));
  }

  return shuffled;
};

const toWebPairOrder = (
  random: () => number,
  linked: readonly string[] | null,
  bias: ThemeMood | null
): readonly FontPair[] => {
  let pairs = WEB_PAIRS;

  if (linked !== null) {
    pairs = WEB_PAIRS.filter((pair) => isPairLinked(pair, linked));
  }

  const matched = pairs.filter((pair) => pair.mood === bias);
  const others = pairs.filter((pair) => pair.mood !== bias);

  return [...toShuffled(random, matched), ...toShuffled(random, others)].map(
    (pair) => toWebFontPair(pair)
  );
};

const toWebFontOf = (family: string): WebFont | null =>
  WEB_PAIRS.flatMap((pair) => [pair.display, pair.body]).find((font) =>
    isSameFamily(font.family, family)
  ) ?? null;

const toFamilyParam = (font: WebFont): string => {
  const name = font.family.replaceAll(" ", "+");

  if (font.axes === null) {
    return `family=${name}`;
  }

  return `family=${name}:${font.axes}`;
};

const toFontLink = (pairs: readonly FontPair[]): string | null => {
  const families = [
    ...new Set(
      pairs.flatMap((pair) => [pair.display.family, pair.body.family])
    ),
  ].flatMap((family) => {
    if (family === null) {
      return [];
    }

    const font = toWebFontOf(family);

    if (font === null) {
      return [];
    }

    return [toFamilyParam(font)];
  });

  if (families.length === 0) {
    return null;
  }

  return `${FONTS_BASE}?${families.join("&")}&display=swap`;
};

const toFamilyParams = (url: string | null): readonly string[] => {
  if (url === null || !URL.canParse(url)) {
    return [];
  }

  return new URL(url.replaceAll("&amp;", "&")).searchParams
    .getAll("family")
    .filter((value) => value.trim() !== "");
};

const toLinkedFamilies = (url: string | null): readonly string[] =>
  toFamilyParams(url).map((value) => (value.split(":")[0] ?? "").trim());

const toMergedFontLink = (links: readonly (string | null)[]): string | null => {
  const params = [...new Set(links.flatMap((link) => toFamilyParams(link)))];

  if (params.length === 0) {
    return null;
  }

  const query = params
    .map((value) => `family=${value.replaceAll(" ", "+")}`)
    .join("&");

  return `${FONTS_BASE}?${query}&display=swap`;
};

export {
  toFontLink,
  toFontPair,
  toLinkedFamilies,
  toMergedFontLink,
  toWebPairOrder,
};

export type { FontOption, FontPair };
