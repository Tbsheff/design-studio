import type { ThemeTokenBase } from "./deps.js";
import type { ThemeInput, ThemeRole, ThemeRoleTokens } from "./engine/index.js";

const ROLE_PATHS: Readonly<Record<ThemeRole, readonly string[]>> = {
  accent: ["color.accent"],
  accentFg: ["color.accent-fg", "color.accent-foreground"],
  bg: ["color.bg", "color.background"],
  border: ["color.border"],
  fg: ["color.fg", "color.foreground"],
  fgMuted: ["color.fg-muted", "color.muted-foreground"],
  primary: ["color.primary"],
  primaryFg: ["color.primary-fg", "color.primary-foreground"],
  ring: ["color.ring"],
  surface: ["color.surface", "color.card"],
};

const DISPLAY_PATHS: readonly string[] = ["font.display", "font.heading"];

const BODY_PATHS: readonly string[] = ["font.body", "font.sans"];

const toFirstPath = (
  known: ReadonlySet<string>,
  options: readonly string[]
): string | null => options.find((option) => known.has(option)) ?? null;

const toRoleTokens = (known: ReadonlySet<string>): ThemeRoleTokens => ({
  accent: toFirstPath(known, ROLE_PATHS.accent),
  accentFg: toFirstPath(known, ROLE_PATHS.accentFg),
  bg: toFirstPath(known, ROLE_PATHS.bg),
  border: toFirstPath(known, ROLE_PATHS.border),
  fg: toFirstPath(known, ROLE_PATHS.fg),
  fgMuted: toFirstPath(known, ROLE_PATHS.fgMuted),
  primary: toFirstPath(known, ROLE_PATHS.primary),
  primaryFg: toFirstPath(known, ROLE_PATHS.primaryFg),
  ring: toFirstPath(known, ROLE_PATHS.ring),
  surface: toFirstPath(known, ROLE_PATHS.surface),
});

const RADIUS_ORDER: readonly string[] = [
  "radius.lg",
  "radius.md",
  "radius.base",
  "radius.default",
  "radius.DEFAULT",
  "radius",
];

const toRadiusPath = (base: ThemeTokenBase): string | null => {
  const plain = base.entries.filter(
    (entry) =>
      (entry.path === "radius" || entry.path.startsWith("radius.")) &&
      !entry.value.includes("var(") &&
      !entry.value.includes("calc(")
  );

  const known = new Set(plain.map((entry) => entry.path));

  return toFirstPath(known, RADIUS_ORDER) ?? plain[0]?.path ?? null;
};

interface ThemeSource {
  readonly baseColor: string | null;
  readonly fonts: readonly string[];
  readonly tokens: ThemeInput["tokens"];
}

const toThemeSource = (base: ThemeTokenBase): ThemeSource => {
  const known = new Set(base.entries.map((entry) => entry.path));
  const roles = toRoleTokens(known);
  const display = toFirstPath(known, DISPLAY_PATHS);
  const body = toFirstPath(known, BODY_PATHS);

  const toValue = (path: string | null): string | null =>
    base.entries.find((entry) => entry.path === path)?.value ?? null;

  const fonts = [toValue(display), toValue(body)].filter(
    (value): value is string => value !== null && !value.includes("var(")
  );

  return {
    baseColor: toValue(roles.primary),
    fonts: [...new Set(fonts)],
    tokens: { body, display, roles },
  };
};

export { toRadiusPath, toThemeSource };

export type { ThemeSource };
