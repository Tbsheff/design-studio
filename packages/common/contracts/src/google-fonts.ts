type GoogleFontKind = "display" | "mono" | "sans" | "serif";

interface GoogleFont {
  readonly fallback: string;
  readonly family: string;
  readonly weights: string | null;
}

const GOOGLE_FONTS_ORIGIN = "https://fonts.googleapis.com/css2";

const BOLD_WEIGHTS = "wght@400;700";

const FALLBACKS: Readonly<Record<GoogleFontKind, string>> = {
  display: "ui-sans-serif, system-ui, sans-serif",
  mono: "ui-monospace, monospace",
  sans: "ui-sans-serif, system-ui, sans-serif",
  serif: "ui-serif, serif",
};

const CATALOG: readonly (readonly [string, GoogleFontKind, boolean])[] = [
  ["Inter", "sans", true],
  ["Roboto", "sans", true],
  ["Open Sans", "sans", true],
  ["Lato", "sans", true],
  ["Montserrat", "sans", true],
  ["Poppins", "sans", true],
  ["Nunito", "sans", true],
  ["Raleway", "sans", true],
  ["Work Sans", "sans", true],
  ["DM Sans", "sans", true],
  ["Manrope", "sans", true],
  ["Plus Jakarta Sans", "sans", true],
  ["Outfit", "sans", true],
  ["Figtree", "sans", true],
  ["Space Grotesk", "sans", true],
  ["IBM Plex Sans", "sans", true],
  ["Source Sans 3", "sans", true],
  ["Rubik", "sans", true],
  ["Karla", "sans", true],
  ["Lexend", "sans", true],
  ["Fraunces", "serif", true],
  ["Playfair Display", "serif", true],
  ["Lora", "serif", true],
  ["Merriweather", "serif", true],
  ["EB Garamond", "serif", true],
  ["Libre Baskerville", "serif", true],
  ["Crimson Pro", "serif", true],
  ["Source Serif 4", "serif", true],
  ["DM Serif Display", "serif", false],
  ["Cormorant Garamond", "serif", true],
  ["Instrument Serif", "serif", false],
  ["JetBrains Mono", "mono", true],
  ["IBM Plex Mono", "mono", true],
  ["Fira Code", "mono", true],
  ["Space Mono", "mono", true],
  ["Roboto Mono", "mono", true],
  ["Source Code Pro", "mono", true],
  ["Bebas Neue", "display", false],
  ["Oswald", "display", true],
  ["Archivo Black", "display", false],
];

const toWeights = (isBold: boolean): string | null => {
  if (isBold) {
    return BOLD_WEIGHTS;
  }

  return null;
};

const GOOGLE_FONTS: readonly GoogleFont[] = CATALOG.map(
  ([family, kind, isBold]) => {
    const fallback = FALLBACKS[kind];
    const weights = toWeights(isBold);

    return { fallback, family, weights };
  }
);

const toFontKey = (family: string): string =>
  family.toLowerCase().replaceAll(/[^a-z0-9]/gu, "");

const toFirstFamily = (stack: string): string =>
  (stack.split(",")[0] ?? "").replaceAll(/["']/gu, "").trim();

const toGoogleFont = (stack: string): GoogleFont | null => {
  const key = toFontKey(toFirstFamily(stack));

  return GOOGLE_FONTS.find((font) => toFontKey(font.family) === key) ?? null;
};

const toGoogleFontStack = (font: GoogleFont): string =>
  `'${font.family}', ${font.fallback}`;

const toGoogleFontParam = (font: GoogleFont): string => {
  const name = `family=${font.family.replaceAll(" ", "+")}`;

  if (font.weights === null) {
    return name;
  }

  return `${name}:${font.weights}`;
};

const toGoogleFontsHref = (fonts: readonly GoogleFont[]): string =>
  `${GOOGLE_FONTS_ORIGIN}?${fonts.map((font) => toGoogleFontParam(font)).join("&")}&display=swap`;

const toLinkFamilies = (href: string): string[] =>
  (href.split("?")[1] ?? "")
    .replaceAll("&amp;", "&")
    .split("&")
    .filter((part) => part.startsWith("family="))
    .map((part) =>
      (part.slice("family=".length).split(":")[0] ?? "")
        .replaceAll("+", " ")
        .replaceAll("%20", " ")
        .trim()
    );

const hasLinkFamily = (href: string, font: GoogleFont): boolean =>
  toLinkFamilies(href).some(
    (family) => toFontKey(family) === toFontKey(font.family)
  );

const toGlue = (href: string): string => {
  if (href.includes("&amp;")) {
    return "&amp;";
  }

  return "&";
};

const toMergedHref = (href: string, font: GoogleFont): string => {
  const glue = toGlue(href);
  const param = `${glue}${toGoogleFontParam(font)}`;
  const display = href.indexOf(`${glue}display=`);

  if (display === -1) {
    return `${href}${param}`;
  }

  return `${href.slice(0, display)}${param}${href.slice(display)}`;
};

export {
  GOOGLE_FONTS,
  GOOGLE_FONTS_ORIGIN,
  hasLinkFamily,
  toGoogleFont,
  toGoogleFontStack,
  toGoogleFontsHref,
  toLinkFamilies,
  toMergedHref,
};

export type { GoogleFont, GoogleFontKind };
