type PhotoArtOrientation = "any" | "square" | "tall" | "wide";

interface PhotoArtColors {
  readonly accent: string;
  readonly ink: string;
  readonly primary: string;
  readonly surface: string;
}

interface PhotoArtInput {
  readonly colors: PhotoArtColors;
  readonly orientation: PhotoArtOrientation;
  readonly words: string;
}

interface PhotoArtSize {
  readonly height: number;
  readonly width: number;
}

type ArtAttrs = Readonly<Record<string, number | string>>;

const FALLBACK_COLORS: PhotoArtColors = {
  accent: "#e07a5f",
  ink: "#2b2d42",
  primary: "#3d5a80",
  surface: "#f4efe6",
};

const SIZES: Readonly<Record<PhotoArtOrientation, PhotoArtSize>> = {
  any: { height: 1100, width: 1600 },
  square: { height: 1200, width: 1200 },
  tall: { height: 1400, width: 1000 },
  wide: { height: 1000, width: 1600 },
};

const ART = {
  angleMax: 360,
  arcStroke: 0.32,
  countMin: 3,
  countSpread: 4,
  countStep: 999,
  glowMin: 20,
  glowOpacity: 0.55,
  glowSpread: 60,
  glowStep: 900,
  hashBase: 31,
  hashModulo: 4_294_967_291,
  hexBase: 16,
  hexWidth: 8,
  opacityMin: 0.22,
  opacitySpread: 0.45,
  pillHeight: 1.2,
  pillRadius: 2.4,
  pillTurn: 180,
  radiusMin: 0.12,
  radiusSpread: 0.3,
  ringStroke: 0.18,
  stepsPerItem: 8,
} as const;

const STEP = {
  angle: 6,
  color: 4,
  kind: 0,
  opacity: 5,
  radius: 3,
  x: 1,
  y: 2,
} as const;

const SAFE_COLOR = /^[#\w(),.%\s/+-]{1,80}$/u;

const KINDS = ["circle", "ring", "pill", "arc"] as const;

const GRAIN_MATRIX = "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.09 0";

const toHashNumber = (text: string): number => {
  let hash = 0;

  for (const char of text) {
    hash = (hash * ART.hashBase + (char.codePointAt(0) ?? 0)) % ART.hashModulo;
  }

  return hash;
};

const toArtHash = (text: string): string =>
  toHashNumber(text).toString(ART.hexBase).padStart(ART.hexWidth, "0");

const toUnit = (seed: string, step: number): number =>
  toHashNumber(`${seed}:${step}`) / ART.hashModulo;

const toSafeColor = (value: string, fallback: string): string => {
  const trimmed = value.trim();

  if (SAFE_COLOR.test(trimmed)) {
    return trimmed;
  }

  return fallback;
};

const toSafeColors = (colors: PhotoArtColors): PhotoArtColors => ({
  accent: toSafeColor(colors.accent, FALLBACK_COLORS.accent),
  ink: toSafeColor(colors.ink, FALLBACK_COLORS.ink),
  primary: toSafeColor(colors.primary, FALLBACK_COLORS.primary),
  surface: toSafeColor(colors.surface, FALLBACK_COLORS.surface),
});

const SVG_NAMES = new Map([
  ["left", "x"],
  ["path", "d"],
  ["radius", "r"],
  ["top", "y"],
]);

const toAttrText = (attrs: ArtAttrs): string =>
  Object.entries(attrs)
    .map(([key, value]) => `${SVG_NAMES.get(key) ?? key}="${String(value)}"`)
    .join(" ");

const toElement = (name: string, attrs: ArtAttrs): string =>
  ["<", name, " ", toAttrText(attrs), "/>"].join("");

const toOpen = (name: string, attrs: ArtAttrs): string =>
  ["<", name, " ", toAttrText(attrs), ">"].join("");

const toClose = (name: string): string => ["</", name, ">"].join("");

const toPaletteColor = (colors: PhotoArtColors, pick: number): string => {
  const palette = [colors.accent, colors.primary, colors.surface, colors.ink];

  return palette[Math.floor(pick * palette.length)] ?? colors.accent;
};

interface ArtMark {
  readonly across: number;
  readonly color: string;
  readonly down: number;
  readonly kind: (typeof KINDS)[number];
  readonly opacity: string;
  readonly radius: number;
  readonly turn: number;
}

const toMark = (
  seed: string,
  index: number,
  size: PhotoArtSize,
  colors: PhotoArtColors
): ArtMark => {
  const base = index * ART.stepsPerItem;
  const short = Math.min(size.width, size.height);
  const unit = (step: number): number => toUnit(seed, base + step);

  return {
    across: Math.round(unit(STEP.x) * size.width),
    color: toPaletteColor(colors, unit(STEP.color)),
    down: Math.round(unit(STEP.y) * size.height),
    kind: KINDS[Math.floor(unit(STEP.kind) * KINDS.length)] ?? "circle",
    opacity: (ART.opacityMin + unit(STEP.opacity) * ART.opacitySpread).toFixed(
      2
    ),
    radius: Math.round(
      short * (ART.radiusMin + unit(STEP.radius) * ART.radiusSpread)
    ),
    turn: Math.round(unit(STEP.angle) * ART.pillTurn),
  };
};

const toRing = (mark: ArtMark): string =>
  toElement("circle", {
    cx: mark.across,
    cy: mark.down,
    fill: "none",
    opacity: mark.opacity,
    radius: mark.radius,
    stroke: mark.color,
    "stroke-width": Math.round(mark.radius * ART.ringStroke),
  });

const toPill = (mark: ArtMark): string => {
  const half = Math.round(mark.radius / ART.pillRadius);

  return toElement("rect", {
    fill: mark.color,
    height: Math.round(mark.radius / ART.pillHeight),
    left: mark.across - mark.radius,
    opacity: mark.opacity,
    rx: half,
    top: mark.down - half,
    transform: `rotate(${mark.turn} ${mark.across} ${mark.down})`,
    width: mark.radius * 2,
  });
};

const toArc = (mark: ArtMark): string =>
  toElement("path", {
    fill: "none",
    opacity: mark.opacity,
    path: `M ${mark.across - mark.radius} ${mark.down} A ${mark.radius} ${mark.radius} 0 0 1 ${mark.across + mark.radius} ${mark.down}`,
    stroke: mark.color,
    "stroke-linecap": "round",
    "stroke-width": Math.round(mark.radius * ART.arcStroke),
  });

const toDot = (mark: ArtMark): string =>
  toElement("circle", {
    cx: mark.across,
    cy: mark.down,
    fill: mark.color,
    opacity: mark.opacity,
    radius: mark.radius,
  });

const MARK_WRITERS: Readonly<
  Record<ArtMark["kind"], (mark: ArtMark) => string>
> = {
  arc: toArc,
  circle: toDot,
  pill: toPill,
  ring: toRing,
};

const toStop = (offset: number, color: string, opacity: number): string =>
  toElement("stop", {
    offset,
    "stop-color": color,
    "stop-opacity": opacity,
  });

const toDefs = (seed: string, colors: PhotoArtColors): string => {
  const angle = Math.round(toUnit(seed, ART.glowStep) * ART.angleMax);

  const glowX = Math.round(
    ART.glowMin + toUnit(seed, ART.glowStep + 1) * ART.glowSpread
  );

  const glowY = Math.round(
    ART.glowMin + toUnit(seed, ART.glowStep + 2) * ART.glowSpread
  );

  return [
    toOpen("defs", {}),
    toOpen("linearGradient", {
      gradientTransform: `rotate(${angle} 0.5 0.5)`,
      id: "base",
    }),
    toStop(0, colors.surface, 1),
    toStop(1, colors.primary, 1),
    toClose("linearGradient"),
    toOpen("radialGradient", {
      cx: `${glowX}%`,
      cy: `${glowY}%`,
      id: "glow",
      radius: "60%",
    }),
    toStop(0, colors.accent, ART.glowOpacity),
    toStop(1, colors.accent, 0),
    toClose("radialGradient"),
    toOpen("filter", {
      height: "100%",
      id: "grain",
      left: 0,
      top: 0,
      width: "100%",
    }),
    toElement("feTurbulence", {
      baseFrequency: 0.85,
      numOctaves: 2,
      stitchTiles: "stitch",
      type: "fractalNoise",
    }),
    toElement("feColorMatrix", { values: GRAIN_MATRIX }),
    toClose("filter"),
    toClose("defs"),
  ].join("");
};

const toFill = (fill: string): string =>
  toElement("rect", { fill, height: "100%", width: "100%" });

const toPhotoArt = (input: PhotoArtInput): string => {
  const colors = toSafeColors(input.colors);
  const size = SIZES[input.orientation];
  const seed = input.words.trim().toLowerCase();

  const count =
    ART.countMin + Math.floor(toUnit(seed, ART.countStep) * ART.countSpread);

  const marks = Array.from({ length: count }, (_unused, index) => {
    const mark = toMark(seed, index, size, colors);

    return MARK_WRITERS[mark.kind](mark);
  });

  return [
    toOpen("svg", {
      height: size.height,
      preserveAspectRatio: "xMidYMid slice",
      viewBox: `0 0 ${size.width} ${size.height}`,
      width: size.width,
      xmlns: "http://www.w3.org/2000/svg",
    }),
    toDefs(seed, colors),
    toFill("url(#base)"),
    toFill("url(#glow)"),
    ...marks,
    toElement("rect", { filter: "url(#grain)", height: "100%", width: "100%" }),
    toClose("svg"),
    "",
  ].join("\n");
};

export { FALLBACK_COLORS, toArtHash, toPhotoArt };

export type { PhotoArtColors, PhotoArtInput, PhotoArtOrientation };
