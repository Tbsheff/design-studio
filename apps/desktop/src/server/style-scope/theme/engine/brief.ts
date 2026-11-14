import type { ThemeMood } from "./types.js";

interface BriefHint {
  readonly hue: number | null;
  readonly mood: ThemeMood | null;
  readonly radius: string | null;
}

interface RadiusRule {
  readonly radius: string;
  readonly words: readonly string[];
}

interface BriefRule {
  readonly hue: number | null;
  readonly mood: ThemeMood | null;
  readonly words: readonly string[];
}

const BRIEF_RULES: readonly BriefRule[] = [
  {
    hue: 45,
    mood: null,
    words: ["warm", "sunset", "coffee", "autumn", "amber"],
  },
  {
    hue: 45,
    mood: "serif",
    words: ["bakery", "bread", "pastry", "patisserie", "cafe"],
  },
  {
    hue: 25,
    mood: null,
    words: ["red", "bold", "energy", "energetic", "fire"],
  },
  {
    hue: 150,
    mood: null,
    words: ["green", "nature", "organic", "forest", "eco"],
  },
  { hue: 195, mood: null, words: ["teal", "fresh", "clean", "mint"] },
  {
    hue: 250,
    mood: null,
    words: ["blue", "trust", "finance", "ocean", "cool"],
  },
  { hue: 300, mood: null, words: ["purple", "creative", "royal", "violet"] },
  { hue: 350, mood: "rounded", words: ["pink", "playful", "soft", "friendly"] },
  {
    hue: null,
    mood: "serif",
    words: [
      "serif",
      "editorial",
      "elegant",
      "classic",
      "luxury",
      "law",
      "legal",
      "lawyer",
      "attorney",
      "magazine",
    ],
  },
  {
    hue: null,
    mood: "mono",
    words: ["mono", "tech", "code", "developer", "terminal"],
  },
  { hue: null, mood: "rounded", words: ["rounded", "kids", "cute"] },
  { hue: null, mood: "sans", words: ["modern", "minimal", "neutral", "swiss"] },
];

const RADIUS_RULES: readonly RadiusRule[] = [
  {
    radius: "4px",
    words: [
      "editorial",
      "finance",
      "financial",
      "bank",
      "law",
      "legal",
      "lawyer",
      "attorney",
      "magazine",
      "news",
      "corporate",
      "consulting",
      "architecture",
    ],
  },
  {
    radius: "16px",
    words: ["playful", "kids", "kid", "toy", "toys", "candy", "cute", "fun"],
  },
  {
    radius: "12px",
    words: [
      "cafe",
      "coffee",
      "bakery",
      "bread",
      "pastry",
      "patisserie",
      "friendly",
      "soft",
      "pet",
      "pets",
    ],
  },
];

const toWords = (brief: string): ReadonlySet<string> =>
  new Set(
    brief
      .toLowerCase()
      .split(/[^a-z]+/u)
      .filter(Boolean)
  );

const toBriefHint = (brief: string | null): BriefHint => {
  if (brief === null) {
    return { hue: null, mood: null, radius: null };
  }

  const words = toWords(brief);

  const matched = BRIEF_RULES.filter((rule) =>
    rule.words.some((word) => words.has(word))
  );

  return {
    hue: matched.find((rule) => rule.hue !== null)?.hue ?? null,
    mood: matched.find((rule) => rule.mood !== null)?.mood ?? null,
    radius:
      RADIUS_RULES.find((rule) => rule.words.some((word) => words.has(word)))
        ?.radius ?? null,
  };
};

export { toBriefHint };

export type { BriefHint };
