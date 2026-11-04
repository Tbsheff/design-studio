import { REQUIRED_TOKENS } from "@design-studio/contracts";

import type { CandidateConfidence } from "./types.js";

export type TokenGroup = keyof typeof REQUIRED_TOKENS;

export interface NameMatch {
  token: string;
  confidence: CandidateConfidence;
}

const COLOR_NAMES: Record<string, { high: string[]; medium: string[] }> = {
  accent: {
    high: ["accent", "highlight", "accent-default", "accent-500"],
    medium: ["secondary", "tertiary", "accent-secondary"],
  },
  "accent-fg": {
    high: [
      "accent-fg",
      "accent-foreground",
      "on-accent",
      "accent-contrast",
      "accent-content",
      "accent-text",
    ],
    medium: ["secondary-foreground", "on-secondary", "secondary-content"],
  },
  bg: {
    high: [
      "bg",
      "background",
      "bg-default",
      "background-default",
      "page",
      "page-bg",
      "body-bg",
      "canvas",
      "bg-page",
      "background-primary",
      "surface-page",
    ],
    medium: ["base-100", "base", "white", "paper"],
  },
  border: {
    high: [
      "border",
      "border-color",
      "border-default",
      "divider",
      "line",
      "stroke",
      "outline",
      "border-subtle",
    ],
    medium: ["input", "separator", "hairline"],
  },
  danger: {
    high: [
      "danger",
      "destructive",
      "error",
      "negative",
      "critical",
      "danger-500",
      "error-500",
    ],
    medium: ["red"],
  },
  fg: {
    high: [
      "fg",
      "foreground",
      "text",
      "text-primary",
      "text-default",
      "fg-default",
      "body-color",
      "on-background",
      "on-surface",
      "ink",
      "base-content",
      "body-text",
      "text-color",
    ],
    medium: ["content", "body", "black", "dark"],
  },
  "fg-muted": {
    high: [
      "fg-muted",
      "muted-foreground",
      "text-muted",
      "text-secondary",
      "muted-text",
      "text-subtle",
      "fg-subtle",
      "secondary-text",
      "fg-secondary",
      "text-tertiary",
    ],
    medium: ["subtle", "gray", "grey", "neutral", "muted-color"],
  },
  primary: {
    high: [
      "primary",
      "brand",
      "brand-primary",
      "action",
      "cta",
      "interactive",
      "primary-500",
      "brand-500",
      "accent-primary",
      "button-bg",
      "primary-default",
    ],
    medium: ["link", "main", "theme", "blue", "key"],
  },
  "primary-fg": {
    high: [
      "primary-fg",
      "primary-foreground",
      "on-primary",
      "primary-contrast",
      "primary-content",
      "primary-text",
      "on-brand",
      "button-text",
      "brand-foreground",
    ],
    medium: [],
  },
  ring: {
    high: [
      "ring",
      "focus",
      "focus-ring",
      "ring-color",
      "outline-focus",
      "focus-color",
    ],
    medium: [],
  },
  success: {
    high: ["success", "positive", "ok", "valid", "success-500"],
    medium: ["green"],
  },
  surface: {
    high: [
      "surface",
      "card",
      "panel",
      "bg-subtle",
      "bg-surface",
      "background-secondary",
      "bg-secondary",
      "surface-1",
      "elevated",
      "bg-elevated",
      "card-bg",
    ],
    medium: ["popover", "muted", "base-200", "bg-muted", "surface-raised"],
  },
  warning: {
    high: ["warning", "caution", "warn", "warning-500"],
    medium: ["yellow", "amber", "orange"],
  },
};

const FONT_NAMES: Record<string, { high: string[]; medium: string[] }> = {
  body: {
    high: [
      "body",
      "sans",
      "base",
      "text",
      "font-body",
      "font-sans",
      "font-base",
      "font-text",
      "primary",
      "default",
      "family",
      "font-family",
      "font-primary",
    ],
    medium: ["ui", "main", "copy"],
  },
  display: {
    high: [
      "display",
      "heading",
      "headings",
      "header",
      "title",
      "headline",
      "font-display",
      "font-heading",
      "font-headings",
      "font-title",
    ],
    medium: ["serif", "brand"],
  },
  mono: {
    high: ["mono", "code", "monospace", "font-mono", "font-code"],
    medium: ["pre"],
  },
};

const RADIUS_SUFFIX: Record<string, NameMatch> = {
  "": { confidence: "medium", token: "md" },
  base: { confidence: "high", token: "md" },
  circle: { confidence: "medium", token: "pill" },
  default: { confidence: "high", token: "md" },
  full: { confidence: "high", token: "pill" },
  l: { confidence: "high", token: "lg" },
  large: { confidence: "high", token: "lg" },
  lg: { confidence: "high", token: "lg" },
  m: { confidence: "high", token: "md" },
  md: { confidence: "high", token: "md" },
  medium: { confidence: "high", token: "md" },
  pill: { confidence: "high", token: "pill" },
  round: { confidence: "high", token: "pill" },
  rounded: { confidence: "medium", token: "pill" },
  s: { confidence: "high", token: "sm" },
  sm: { confidence: "high", token: "sm" },
  small: { confidence: "high", token: "sm" },
  xl: { confidence: "medium", token: "lg" },
  xs: { confidence: "medium", token: "sm" },
};

const SHADOW_SUFFIX: Record<string, string> = {
  "": "md",
  "1": "sm",
  "2": "md",
  "3": "lg",
  default: "md",
  large: "lg",
  lg: "lg",
  md: "md",
  medium: "md",
  sm: "sm",
  small: "sm",
  xl: "lg",
  xs: "sm",
};

const PREFIXES = [
  "wp--preset--color--",
  "wp--preset--font-family--",
  "wp--preset--",
  "md-sys-color-",
  "md-sys-",
  "sys-color-",
  "colors-",
  "color-",
  "clr-",
  "col-",
  "c-",
  "theme-",
  "semantic-",
  "sys-",
  "ref-",
  "global-",
  "ds-",
  "tw-",
  "bs-",
  "chakra-colors-",
  "mantine-color-",
];

export function normalizeName(raw: string): string {
  let name = raw
    .trim()
    .toLowerCase()
    .replace(/^-+/, "")
    .replaceAll(/[._/\s]+/g, "-")
    .replaceAll(/-+/g, "-");

  for (let changed = true; changed;) {
    changed = false;

    for (const prefix of PREFIXES) {
      if (name.startsWith(prefix) && name.length > prefix.length) {
        name = name.slice(prefix.length);
        changed = true;
      }
    }
  }

  return name.replace(/-(default|base|value)$/, "");
}

function lookup(
  table: Record<string, { high: string[]; medium: string[] }>,
  name: string
): NameMatch | null {
  for (const [token, names] of Object.entries(table)) {
    if (names.high.includes(name)) {
      return { confidence: "high", token };
    }
  }

  for (const [token, names] of Object.entries(table)) {
    if (names.medium.includes(name)) {
      return { confidence: "medium", token };
    }
  }

  return null;
}

function stripGroup(name: string, words: string[]): string | null {
  for (const word of words) {
    if (name === word) {
      return "";
    }

    if (name.startsWith(`${word}-`)) {
      return name.slice(word.length + 1);
    }
  }

  return null;
}

export function matchColorName(raw: string): NameMatch | null {
  const name = normalizeName(raw);
  const found = lookup(COLOR_NAMES, name);

  return found
    ? { confidence: found.confidence, token: `color.${found.token}` }
    : null;
}

export function matchFontName(raw: string): NameMatch | null {
  const name = normalizeName(raw);

  const bare = stripGroup(name, [
    "font-family",
    "fontfamily",
    "font-families",
    "fontfamilies",
    "fonts",
    "font",
    "ff",
    "family",
    "typeface",
  ]);

  const found =
    (bare !== null && bare !== "" ? lookup(FONT_NAMES, bare) : null) ??
    lookup(FONT_NAMES, name);

  return found
    ? { confidence: found.confidence, token: `font.${found.token}` }
    : null;
}

export function matchRadiusName(raw: string): NameMatch | null {
  const name = normalizeName(raw);

  const suffix = stripGroup(name, [
    "border-radius",
    "borderradius",
    "radius",
    "radii",
    "rounded",
    "corner",
    "corners",
  ]);

  if (suffix === null) {
    return null;
  }

  const found = RADIUS_SUFFIX[suffix];

  return found
    ? { confidence: found.confidence, token: `radius.${found.token}` }
    : null;
}

export function matchShadowName(raw: string): NameMatch | null {
  const name = normalizeName(raw);

  const suffix = stripGroup(name, [
    "box-shadow",
    "boxshadow",
    "shadows",
    "shadow",
    "elevation",
  ]);

  if (suffix === null) {
    return null;
  }

  const found = SHADOW_SUFFIX[suffix];

  return found
    ? {
        confidence: suffix === "" ? "medium" : "high",
        token: `shadow.${found}`,
      }
    : null;
}

export function matchScaleName(
  raw: string,
  group: "text" | "space"
): NameMatch | null {
  const name = normalizeName(raw);

  const words =
    group === "text"
      ? [
          "font-size",
          "fontsize",
          "font-sizes",
          "fontsizes",
          "text",
          "fs",
          "size",
        ]
      : ["spacing", "space", "spacer", "gap", "sp"];

  const suffix = stripGroup(name, words);

  if (suffix === null || suffix === "") {
    return null;
  }

  const required: readonly string[] = REQUIRED_TOKENS[group];

  return required.includes(suffix)
    ? { confidence: "high", token: `${group}.${suffix}` }
    : null;
}

export type ValueKind = "color" | "font" | "dimension" | "shadow" | "unknown";

export function matchName(raw: string, kind: ValueKind): NameMatch | null {
  if (kind === "color") {
    return matchColorName(raw);
  }

  if (kind === "font") {
    return matchFontName(raw);
  }

  if (kind === "shadow") {
    return matchShadowName(raw);
  }

  if (kind === "dimension") {
    return (
      matchRadiusName(raw) ??
      matchScaleName(raw, "text") ??
      matchScaleName(raw, "space")
    );
  }

  return null;
}

const CANONICAL: Record<string, string[]> = {
  "color.accent": ["accent"],
  "color.accent-fg": ["accent-fg", "accent-foreground"],
  "color.bg": ["bg", "background"],
  "color.border": ["border"],
  "color.danger": ["danger", "destructive"],
  "color.fg": ["fg", "foreground"],
  "color.fg-muted": ["fg-muted", "muted-foreground"],
  "color.primary": ["primary"],
  "color.primary-fg": ["primary-fg", "primary-foreground"],
  "color.ring": ["ring"],
  "color.success": ["success"],
  "color.surface": ["surface", "card"],
  "color.warning": ["warning"],
};

export function isCanonicalName(raw: string, token: string): boolean {
  const name = normalizeName(raw);

  return CANONICAL[token]?.includes(name) ?? name === token.replace(".", "-");
}

export function requiredPaths(): string[] {
  return Object.entries(REQUIRED_TOKENS).flatMap(([group, names]) =>
    names.map((name) => `${group}.${name}`)
  );
}
