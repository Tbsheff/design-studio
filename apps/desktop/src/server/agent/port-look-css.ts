import { Result, Schema } from "effect";

import { toDecoder } from "../platform/decode/index.js";

interface PortLookFont {
  readonly family: string;
  readonly where: string;
}

interface CssDeclaration {
  readonly name: string;
  readonly value: string;
}

const GENERIC_FONTS = new Set([
  "-apple-system",
  "blinkmacsystemfont",
  "cursive",
  "emoji",
  "fangsong",
  "fantasy",
  "inherit",
  "initial",
  "math",
  "monospace",
  "revert",
  "sans-serif",
  "serif",
  "system-ui",
  "unset",
]);

const PACK_KEYS = ["display", "body", "mono"] as const;

const NEXT_FONT_IMPORT =
  /import\s*\{(?<names>[^}]+)\}\s*from\s*["']next\/font\/google["']/gu;

const FONT_FACE = /@font-face\s*\{(?<body>[^}]*)\}/gu;

const THEME_BLOCK = /@theme[^{]*\{(?<body>[^}]*)\}/gu;

const GOOGLE_FONTS = /fonts\.googleapis\.com\/css2?\?(?<query>[^"')\s]+)/gu;

const FONT_NAME = /^[A-Z][A-Za-z0-9_]{1,40}$/u;

const VAR_DEPTH = 4;

const VAR_OPEN = "var(";

const PackFontsSchema = Schema.Struct({
  fonts: Schema.Struct({
    body: Schema.optionalKey(Schema.String),
    display: Schema.optionalKey(Schema.String),
    mono: Schema.optionalKey(Schema.String),
  }),
});

const toPackFonts = toDecoder(Schema.fromJsonString(PackFontsSchema), "ignore");

const toDeclarations = (css: string): CssDeclaration[] =>
  css.split(/[;{}]/u).flatMap((piece) => {
    const colon = piece.indexOf(":");

    if (colon === -1) {
      return [];
    }

    const name = piece.slice(0, colon).trim();
    const value = piece.slice(colon + 1).trim();

    if (name === "" || value === "") {
      return [];
    }

    return [{ name, value }];
  });

const toCleanFamily = (raw: string): string =>
  raw
    .trim()
    .replaceAll(/^["']|["']$/gu, "")
    .trim();

const isGenericFont = (family: string): boolean => {
  const key = family.toLowerCase();

  return key === "" || key.startsWith("ui-") || GENERIC_FONTS.has(key);
};

const toVarParts = (
  stack: string
): { readonly fallback: string | null; readonly name: string } | null => {
  if (!stack.startsWith(VAR_OPEN) || !stack.endsWith(")")) {
    return null;
  }

  const inner = stack.slice(VAR_OPEN.length, -1);
  const comma = inner.indexOf(",");

  if (comma === -1) {
    return { fallback: null, name: inner.trim() };
  }

  return {
    fallback: inner.slice(comma + 1).trim(),
    name: inner.slice(0, comma).trim(),
  };
};

const toFirstFamily = (
  stack: string,
  defs: ReadonlyMap<string, string>,
  depth: number
): string | null => {
  const head = stack.trim();
  const ref = toVarParts(head);

  if (ref) {
    const value = defs.get(ref.name) ?? ref.fallback;

    if (value === null || depth >= VAR_DEPTH) {
      return null;
    }

    return toFirstFamily(value, defs, depth + 1);
  }

  const family = toCleanFamily(head.split(",")[0] ?? "");

  if (isGenericFont(family) || family.startsWith(VAR_OPEN)) {
    return null;
  }

  return family;
};

const toUniqueFamilies = (families: readonly string[]): string[] => {
  const seen = new Map<string, string>();

  for (const family of families) {
    const key = family.toLowerCase();

    if (!seen.has(key)) {
      seen.set(key, family);
    }
  }

  return [...seen.values()];
};

const toGoogleFamily = (part: string): string[] => {
  if (!part.startsWith("family=")) {
    return [];
  }

  const name = part.slice("family=".length).split(":")[0] ?? "";
  const family = decodeURIComponent(name.replaceAll("+", " ")).trim();

  if (family === "") {
    return [];
  }

  return [family];
};

const toGoogleFamilies = (text: string): string[] =>
  [...text.matchAll(GOOGLE_FONTS)].flatMap((match) =>
    (match.groups?.query ?? "")
      .replaceAll("&amp;", "&")
      .split("&")
      .flatMap((part) => toGoogleFamily(part))
  );

const toCustomProperties = (
  css: string,
  base: ReadonlyMap<string, string>
): Map<string, string> => {
  const defs = new Map(base);

  for (const declaration of toDeclarations(css)) {
    if (declaration.name.startsWith("--")) {
      defs.set(declaration.name, declaration.value);
    }
  }

  return defs;
};

const toPackDefs = (text: string | null): Map<string, string> => {
  const defs = new Map<string, string>();

  if (text === null) {
    return defs;
  }

  const decoded = toPackFonts(text);

  if (Result.isFailure(decoded)) {
    return defs;
  }

  for (const key of PACK_KEYS) {
    const value = decoded.success.fonts[key]?.trim() ?? "";

    if (value !== "") {
      defs.set(`--font-${key}`, `"${value}"`);
    }
  }

  return defs;
};

const toFamilyValues = (css: string): string[] =>
  toDeclarations(css).flatMap((declaration) => {
    if (declaration.name !== "font-family") {
      return [];
    }

    return [declaration.value];
  });

const toPrototypeFonts = (
  css: string,
  html: string,
  defs: ReadonlyMap<string, string>
): string[] =>
  toUniqueFamilies([
    ...toFamilyValues(css).flatMap((value) => {
      const family = toFirstFamily(value, defs, 0);

      if (family === null) {
        return [];
      }

      return [family];
    }),
    ...toGoogleFamilies(`${html}\n${css}`),
  ]);

const toNextFonts = (text: string, file: string): PortLookFont[] =>
  [...text.matchAll(NEXT_FONT_IMPORT)].flatMap((match) =>
    (match.groups?.names ?? "").split(",").flatMap((part) => {
      const words = part.trim().split(/\s/u);
      const name = words[0] ?? "";

      if (!FONT_NAME.test(name)) {
        return [];
      }

      return [
        { family: name.replaceAll("_", " "), where: `next/font in ${file}` },
      ];
    })
  );

const toThemeFonts = (body: string, file: string): PortLookFont[] =>
  toDeclarations(body).flatMap((declaration) => {
    if (!declaration.name.startsWith("--font-")) {
      return [];
    }

    const family = toFirstFamily(declaration.value, new Map(), 0);

    if (family === null) {
      return [];
    }

    return [{ family, where: `@theme ${declaration.name} in ${file}` }];
  });

const toCssFonts = (css: string, file: string): PortLookFont[] => {
  const faces = [...css.matchAll(FONT_FACE)].flatMap((face) =>
    toFamilyValues(face.groups?.body ?? "").map((value) => ({
      family: toCleanFamily(value),
      where: `@font-face in ${file}`,
    }))
  );

  const themed = [...css.matchAll(THEME_BLOCK)].flatMap((block) =>
    toThemeFonts(block.groups?.body ?? "", file)
  );

  return [...faces, ...themed];
};

export {
  toCssFonts,
  toCustomProperties,
  toNextFonts,
  toPackDefs,
  toPrototypeFonts,
};

export type { PortLookFont };
