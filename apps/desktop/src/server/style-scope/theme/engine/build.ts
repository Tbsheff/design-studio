import { toBriefHint } from "./brief.js";
import { toContrast, toHue, toHueOf } from "./color.js";
import { toFontPair } from "./fonts.js";
import { toThemeName } from "./names.js";
import { MIN_RATIO, toDarkPalette, toLightPalette } from "./palette.js";
import type { PaletteSpec } from "./palette.js";
import { toHash, toIdText, toPick, toRandom } from "./random.js";
import type {
  ThemeChange,
  ThemeContrast,
  ThemeDraft,
  ThemeInput,
  ThemePalette,
  ThemeResult,
  ThemeRole,
  ThemeTokenMap,
} from "./types.js";

interface TextPair {
  readonly surface: ThemeRole;
  readonly text: ThemeRole;
}

const TEXT_PAIRS: readonly TextPair[] = [
  { surface: "bg", text: "fg" },
  { surface: "surface", text: "fg" },
  { surface: "bg", text: "fgMuted" },
  { surface: "surface", text: "fgMuted" },
  { surface: "primary", text: "primaryFg" },
  { surface: "accent", text: "accentFg" },
  { surface: "bg", text: "primary" },
];

const ROLES: readonly ThemeRole[] = [
  "bg",
  "surface",
  "fg",
  "fgMuted",
  "border",
  "primary",
  "primaryFg",
  "accent",
  "accentFg",
  "ring",
];

const NEAR_TURN = 30;

const OPPOSITE_TURN = 150;

const HALF_TURN = 180;

const ACCENT_TURNS: readonly number[] = [
  NEAR_TURN,
  -NEAR_TURN,
  OPPOSITE_TURN,
  HALF_TURN,
];

const ATTEMPT_FACTOR = 12;

const FULL_TURN = 360;

const HUE_JITTER = 20;

const BRIEF_SPREAD = 24;

const CHROMA_BASE = 0.09;

const CHROMA_RANGE = 0.08;

const NEUTRAL_BASE = 0.004;

const NEUTRAL_RANGE = 0.014;

const RATIO_DIGITS = 100;

const HUE_LIMIT = 360;

const toRoundedRatio = (ratio: number): number =>
  Math.round(ratio * RATIO_DIGITS) / RATIO_DIGITS;

const toRows = (
  palette: ThemePalette,
  modeName: "dark" | "light",
  present: (role: ThemeRole) => boolean
): ThemeContrast[] =>
  TEXT_PAIRS.flatMap((pair) => {
    if (!present(pair.text) || !present(pair.surface)) {
      return [];
    }

    return [
      {
        minimum: MIN_RATIO,
        mode: modeName,
        ratio: toRoundedRatio(
          toContrast(palette[pair.text], palette[pair.surface])
        ),
        surface: pair.surface,
        text: pair.text,
      },
    ];
  });

const toChanges = (
  tokens: ThemeTokenMap,
  light: ThemePalette,
  dark: ThemePalette,
  fonts: { readonly body: string; readonly display: string }
): ThemeChange[] => {
  const changes: ThemeChange[] = [];

  for (const name of ROLES) {
    const tokenPath = tokens.roles[name];

    if (tokenPath !== null) {
      changes.push({
        darkValue: dark[name],
        path: tokenPath,
        role: name,
        value: light[name],
      });
    }
  }

  const { body, display } = tokens;

  if (display !== null) {
    changes.push({
      darkValue: null,
      path: display,
      role: "display",
      value: fonts.display,
    });
  }

  if (body !== null) {
    changes.push({
      darkValue: null,
      path: body,
      role: "body",
      value: fonts.body,
    });
  }

  return changes;
};

const toAnchor = (
  input: ThemeInput,
  random: () => number,
  briefHue: number | null
): number => {
  let base: number | null = null;

  if (input.baseColor !== null) {
    base = toHueOf(input.baseColor);
  }

  return briefHue ?? base ?? random() * HUE_LIMIT;
};

const toSpec = (random: () => number, base: number): PaletteSpec => ({
  accentHue: base + (toPick(random, ACCENT_TURNS) ?? 0),
  chroma: CHROMA_BASE + random() * CHROMA_RANGE,
  hue: base,
  neutral: NEUTRAL_BASE + random() * NEUTRAL_RANGE,
});

const toDraft = (
  input: ThemeInput,
  random: () => number,
  slot: {
    readonly anchor: number;
    readonly index: number;
    readonly spread: number;
  }
): ThemeDraft | null => {
  const hint = toBriefHint(input.brief);
  const jitter = (random() - 1 / 2) * HUE_JITTER;
  const hue = toHue(slot.anchor + slot.index * slot.spread + jitter);
  const spec = toSpec(random, hue);
  const light = toLightPalette(spec);
  const dark = toDarkPalette(spec);
  const pair = toFontPair(random, input.fonts, hint.mood);

  const present = (role: ThemeRole): boolean =>
    input.tokens.roles[role] !== null;

  const contrast = [
    ...toRows(light, "light", present),
    ...toRows(dark, "dark", present),
  ];

  if (contrast.some((row) => row.ratio < row.minimum)) {
    return null;
  }

  const changes = toChanges(input.tokens, light, dark, {
    body: pair.body.stack,
    display: pair.display.stack,
  });

  const source = [
    input.seed,
    input.baseColor ?? "",
    input.brief ?? "",
    changes.map((change) => `${change.path}=${change.value}`).join(","),
  ].join("|");

  return {
    changes,
    contrast,
    fontLink: null,
    id: `theme-${toIdText(source)}`,
    name: toThemeName(hue, pair.display.mood),
    seed: input.seed,
  };
};

const hasRequiredRoles = (input: ThemeInput): boolean =>
  input.tokens.roles.bg !== null &&
  input.tokens.roles.fg !== null &&
  input.tokens.roles.primary !== null &&
  input.tokens.roles.primaryFg !== null;

const toThemes = (input: ThemeInput): ThemeResult => {
  if (!hasRequiredRoles(input)) {
    return { code: "too_few_tokens", ok: false };
  }

  const random = toRandom(input.seed + toHash(input.brief ?? ""));
  const hint = toBriefHint(input.brief);
  const anchor = toAnchor(input, random, hint.hue);
  let spread = FULL_TURN / input.count;

  if (hint.hue !== null) {
    spread = BRIEF_SPREAD;
  }

  const drafts: ThemeDraft[] = [];
  const seen = new Set<string>();
  const attempts = input.count * ATTEMPT_FACTOR;

  for (
    let attempt = 0;
    attempt < attempts && drafts.length < input.count;
    attempt += 1
  ) {
    const index = drafts.length;
    const draft = toDraft(input, random, { anchor, index, spread });

    if (draft !== null && !seen.has(draft.id)) {
      seen.add(draft.id);
      drafts.push(draft);
    }
  }

  if (drafts.length < input.count) {
    return { code: "too_few_candidates", ok: false };
  }

  return { ok: true, value: drafts };
};

export { toChanges, toRows, toThemes };
