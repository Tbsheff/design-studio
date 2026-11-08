import { toChanges, toRows } from "./build.js";
import { toHash, toIdText } from "./random.js";
import {
  toGeneratedPalettes,
  toReferencePalettes,
} from "./reference-palette.js";
import type { ReferenceColors } from "./reference-palette.js";
import type {
  ThemeChange,
  ThemeContrast,
  ThemeDraft,
  ThemePalette,
  ThemeRole,
  ThemeTokenMap,
} from "./types.js";

interface ReferenceFonts {
  readonly body: string | null;
  readonly display: string | null;
}

interface ReferenceInput {
  readonly colors: ReferenceColors;
  readonly fonts: ReferenceFonts;
  readonly name: string;
  readonly radius: string | null;
  readonly radiusPath: string | null;
  readonly sourceKey: string;
  readonly tokens: ThemeTokenMap;
}

interface ReferenceTheme {
  readonly draft: ThemeDraft;
  readonly radius: string | null;
}

type ReferenceResult =
  | { readonly code: "low_contrast" | "too_few_tokens"; readonly ok: false }
  | { readonly ok: true; readonly value: ReferenceTheme };

const SYSTEM_STACK =
  "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";

const FONT_STACK_MAX = 160;

const FONT_UNSAFE = /[;{}<>\\]/u;

const RADIUS_PATTERN = /^(?<amount>\d+(?:\.\d+)?)(?<unit>px|rem)$/u;

const RADIUS_MAX_PX = 24;

const REM_PX = 16;

const SEED_MAX = 2_147_483_646;

const toFontStack = (stack: string | null): string => {
  const trimmed = (stack ?? "").trim();

  if (
    trimmed === "" ||
    trimmed.length > FONT_STACK_MAX ||
    FONT_UNSAFE.test(trimmed)
  ) {
    return SYSTEM_STACK;
  }

  return trimmed;
};

const toRadiusValue = (raw: string | null): string | null => {
  const match = RADIUS_PATTERN.exec((raw ?? "").trim());

  if (match === null) {
    return null;
  }

  const { amount: amountText = "0", unit = "px" } = match.groups ?? {};
  const amount = Number(amountText);
  let pixels = amount;

  if (unit === "rem") {
    pixels = amount * REM_PX;
  }

  return `${Math.min(RADIUS_MAX_PX, Math.round(pixels))}px`;
};

const hasRequiredRoles = (tokens: ThemeTokenMap): boolean =>
  tokens.roles.bg !== null &&
  tokens.roles.fg !== null &&
  tokens.roles.primary !== null &&
  tokens.roles.primaryFg !== null;

const toContrastRows = (
  tokens: ThemeTokenMap,
  light: ThemePalette,
  dark: ThemePalette
): ThemeContrast[] => {
  const present = (role: ThemeRole): boolean => tokens.roles[role] !== null;

  return [...toRows(light, "light", present), ...toRows(dark, "dark", present)];
};

const isPassing = (rows: readonly ThemeContrast[]): boolean =>
  rows.every((row) => row.ratio >= row.minimum);

const toRadiusChange = (
  tokenPath: string | null,
  radius: string | null
): ThemeChange[] => {
  if (tokenPath === null || radius === null) {
    return [];
  }

  return [{ darkValue: null, path: tokenPath, role: "radius", value: radius }];
};

const toReferenceTheme = (input: ReferenceInput): ReferenceResult => {
  if (!hasRequiredRoles(input.tokens)) {
    return { code: "too_few_tokens", ok: false };
  }

  let palettes = toReferencePalettes(input.colors);
  let contrast = toContrastRows(input.tokens, palettes.light, palettes.dark);

  if (!isPassing(contrast)) {
    palettes = toGeneratedPalettes(input.colors);
    contrast = toContrastRows(input.tokens, palettes.light, palettes.dark);
  }

  if (!isPassing(contrast)) {
    return { code: "low_contrast", ok: false };
  }

  const fonts = {
    body: toFontStack(input.fonts.body),
    display: toFontStack(input.fonts.display),
  };

  const radius = toRadiusValue(input.radius);

  const changes = [
    ...toChanges(input.tokens, palettes.light, palettes.dark, fonts),
    ...toRadiusChange(input.radiusPath, radius),
  ];

  const seedValue = toHash(input.sourceKey) % SEED_MAX;
  const values = changes.map((change) => change.value).join(",");
  const idText = toIdText(`${input.sourceKey}|${values}`);

  const draft: ThemeDraft = {
    changes,
    contrast,
    fontLink: null,
    id: `theme-${idText}`,
    name: input.name,
    seed: seedValue,
  };

  return { ok: true, value: { draft, radius } };
};

export { toReferenceTheme };

export type {
  ReferenceColors,
  ReferenceFonts,
  ReferenceInput,
  ReferenceResult,
  ReferenceTheme,
};
