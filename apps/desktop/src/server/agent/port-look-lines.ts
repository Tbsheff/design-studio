import type { PortToken } from "@design-studio/contracts/port";

import { matchColor } from "../../shared/token-match.js";
import type { PortLook, PortLookApp } from "./port-look.js";

const HEX_COLOR = /^#[0-9a-f]{3,8}$/iu;

const COLOR_FUNCTION = /^(?:rgba?|hsla?|oklch|oklab|lab|lch|color)\(/iu;

const isColorValue = (value: string): boolean =>
  HEX_COLOR.test(value) || COLOR_FUNCTION.test(value);

const toSlug = (family: string): string =>
  family
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/gu, "-")
    .replaceAll(/^-|-$/gu, "");

const toCssName = (app: PortLookApp): string => {
  if (app.cssFile === null) {
    return "the global CSS file";
  }

  return app.cssFile;
};

const toFontRule = (family: string, app: PortLookApp): string => {
  const slug = toSlug(family);
  const css = toCssName(app);

  const only =
    "use it only on this route's elements that use it in the prototype";

  if (app.isNext && app.isTailwind) {
    return `not in the app. Add it with next/font in ${app.layoutFile ?? "the root layout"} (variable --font-${slug}-src) and a --font-${slug}: var(--font-${slug}-src) entry in the @theme block of ${css}; write font-${slug} and ${only}.`;
  }

  if (app.isNext) {
    return `not in the app. Add it with next/font in ${app.layoutFile ?? "the root layout"} (variable --font-${slug}) and ${only}, as font-family: var(--font-${slug}).`;
  }

  return `not in the app. Add one @font-face or font <link> and a --font-${slug} variable on :root in ${css}; ${only}.`;
};

const toFontLines = (look: PortLook): string[] => {
  const { app } = look;

  if (app === null) {
    return [...look.fonts];
  }

  return look.fonts.map((family) => {
    const found = app.fonts.find(
      (font) => font.family.toLowerCase() === family.toLowerCase()
    );

    if (found) {
      return `${family} -> app font ${found.family} (${found.where}). Use the app font.`;
    }

    return `${family} -> ${toFontRule(family, app)}`;
  });
};

const toColorRule = (name: string, value: string, app: PortLookApp): string => {
  const css = toCssName(app);

  if (app.isTailwind) {
    const key = name.replace(/^--/u, "").replace(/^color-/u, "");

    return `no app token: add --color-${key}: ${value} to the @theme block in ${css} and use text-${key}, bg-${key} or border-${key}`;
  }

  return `no app token: add ${name}: ${value} to :root in ${css} and use var(${name})`;
};

const toTokenTarget = (
  token: PortToken,
  value: string | null,
  look: PortLook
): string => {
  const { app } = look;

  if (token.target !== null) {
    return token.target;
  }

  if (app === null || value === null) {
    return "no app token";
  }

  const near = matchColor(value, [...app.entries])[0]?.cssVar ?? null;

  if (near !== null) {
    return near;
  }

  if (token.name.startsWith("--font-")) {
    return "no app token: see Fonts";
  }

  if (isColorValue(value)) {
    return toColorRule(token.name, value, app);
  }

  return `no app token: add ${token.name}: ${value} to :root in ${toCssName(app)} and use var(${token.name})`;
};

const toTokenLines = (
  tokens: readonly PortToken[],
  look: PortLook | null
): string[] =>
  tokens.map((token) => {
    const value = token.value ?? look?.defs.get(token.name) ?? null;
    let target = token.target ?? "no app token";

    if (look !== null) {
      target = toTokenTarget(token, value, look);
    }

    if (value === null) {
      return `${token.name} -> ${target}`;
    }

    return `${token.name} = ${value} -> ${target}`;
  });

const toLookFontLines = (look: PortLook | null): string[] => {
  if (look === null) {
    return [];
  }

  return toFontLines(look);
};

export { toLookFontLines, toTokenLines };
