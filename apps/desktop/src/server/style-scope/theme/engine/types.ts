type ThemeRole =
  | "accent"
  | "accentFg"
  | "bg"
  | "border"
  | "fg"
  | "fgMuted"
  | "primary"
  | "primaryFg"
  | "ring"
  | "surface";

type ThemeMood = "mono" | "project" | "rounded" | "sans" | "serif";

type ThemePalette = Readonly<Record<ThemeRole, string>>;

type ThemeRoleTokens = Readonly<Record<ThemeRole, string | null>>;

interface ThemeTokenMap {
  readonly body: string | null;
  readonly display: string | null;
  readonly roles: ThemeRoleTokens;
}

interface ThemeInput {
  readonly baseColor: string | null;
  readonly brief: string | null;
  readonly count: number;
  readonly fonts: readonly string[];
  readonly seed: number;
  readonly tokens: ThemeTokenMap;
}

type ThemeChangeRole = ThemeRole | "body" | "display";

interface ThemeChange {
  readonly darkValue: string | null;
  readonly path: string;
  readonly role: ThemeChangeRole;
  readonly value: string;
}

interface ThemeContrast {
  readonly minimum: number;
  readonly mode: "dark" | "light";
  readonly ratio: number;
  readonly surface: ThemeRole;
  readonly text: ThemeRole;
}

interface ThemeDraft {
  readonly changes: readonly ThemeChange[];
  readonly contrast: readonly ThemeContrast[];
  readonly fontLink: null;
  readonly id: string;
  readonly name: string;
  readonly seed: number;
}

type ThemeResult =
  | {
      readonly code: "too_few_candidates" | "too_few_tokens";
      readonly ok: false;
    }
  | { readonly ok: true; readonly value: readonly ThemeDraft[] };

export type {
  ThemeChange,
  ThemeChangeRole,
  ThemeContrast,
  ThemeDraft,
  ThemeInput,
  ThemeMood,
  ThemePalette,
  ThemeResult,
  ThemeRole,
  ThemeRoleTokens,
  ThemeTokenMap,
};
