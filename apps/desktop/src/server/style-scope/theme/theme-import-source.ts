import path from "node:path";

import type {
  PaletteSwatch,
  ReferenceColors,
  ReferenceFonts,
} from "./engine/index.js";

interface ThemeStyleSample {
  readonly bg: string | null;
  readonly body: string | null;
  readonly colors: readonly PaletteSwatch[];
  readonly display: string | null;
  readonly fg: string | null;
  readonly primary: string | null;
  readonly radius: string | null;
}

interface ImportReference {
  readonly colors: ReferenceColors;
  readonly fontNames: readonly string[];
  readonly fonts: ReferenceFonts;
  readonly kind: "image" | "url";
  readonly label: string;
  readonly radius: string | null;
  readonly value: string;
}

const NAME_MAX = 80;

const toFirstFamily = (stack: string | null): string | null => {
  const first = (stack ?? "").split(",")[0] ?? "";
  const name = first.replaceAll(/["']/gu, "").trim();

  if (name === "") {
    return null;
  }

  return name;
};

const toFontNames = (fonts: ReferenceFonts): string[] => {
  const names = [fonts.display, fonts.body].flatMap((stack) => {
    const name = toFirstFamily(stack);

    if (name === null) {
      return [];
    }

    return [name];
  });

  return [...new Set(names)];
};

const toLabel = (text: string): string => `From ${text}`.slice(0, NAME_MAX);

const toImageReference = (
  imagePath: string,
  swatches: readonly PaletteSwatch[]
): ImportReference => {
  const empty: ReferenceFonts = { body: null, display: null };

  return {
    colors: { bg: null, fg: null, primary: null, swatches },
    fontNames: [],
    fonts: empty,
    kind: "image",
    label: toLabel(path.parse(imagePath).name),
    radius: null,
    value: imagePath,
  };
};

const toHostOf = (url: string): string => {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
};

const toUrlReference = (
  url: string,
  sample: ThemeStyleSample
): ImportReference => {
  const pair: ReferenceFonts = {
    body: sample.body,
    display: sample.display ?? sample.body,
  };

  return {
    colors: {
      bg: sample.bg,
      fg: sample.fg,
      primary: sample.primary,
      swatches: sample.colors,
    },
    fontNames: toFontNames(pair),
    fonts: pair,
    kind: "url",
    label: toLabel(toHostOf(url)),
    radius: sample.radius,
    value: url,
  };
};

export { toImageReference, toUrlReference };

export type { ImportReference, ThemeStyleSample };
