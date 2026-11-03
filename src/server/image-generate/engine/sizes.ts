type Aspect = "hero" | "square" | "tall" | "wide";

type Style = "abstract" | "icon" | "illustration" | "photo";

interface Size {
  readonly height: number;
  readonly width: number;
}

const SIZES: Readonly<Record<Aspect, Size>> = {
  hero: { height: 900, width: 1600 },
  square: { height: 1024, width: 1024 },
  tall: { height: 1280, width: 720 },
  wide: { height: 720, width: 1280 },
};

const STYLE_TEXT: Readonly<Record<Style, string>> = {
  abstract: "abstract art, flowing shapes, rich color",
  icon: "flat icon, simple shapes, plain background, no text",
  illustration: "clean digital illustration, no text",
  photo: "realistic photograph, natural light, no text",
};

const toSize = (aspect: Aspect): Size => SIZES[aspect];

const toStyledPrompt = (prompt: string, style: Style): string =>
  `${prompt.trim()}. Style: ${STYLE_TEXT[style]}.`;

export { toSize, toStyledPrompt };

export type { Aspect, Size, Style };
