import { classify, parseClass } from "../tailwind/classes.js";
import type { Classified, ParsedClass } from "../tailwind/classes.js";
import { classProps } from "../tailwind/map.js";
import type { TailwindTheme } from "../tailwind/theme-model.js";
import { toScaledValue } from "./scale-values.js";

const RADIUS = "border-radius";

const FONT_SIZE = "font-size";

const ROW_GAP = "row-gap";

const COLUMN_GAP = "column-gap";

const SCALE_PROPERTIES = [
  "width",
  "height",
  FONT_SIZE,
  "line-height",
  "letter-spacing",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "margin-top",
  "margin-right",
  "margin-bottom",
  "margin-left",
  ROW_GAP,
  COLUMN_GAP,
  RADIUS,
  "border-width",
  "box-shadow",
] as const;

type ScaleProperty = (typeof SCALE_PROPERTIES)[number];

type SourceKind = "length" | "token";

interface ScaleSite {
  readonly classes: readonly string[];
  readonly isTailwind: boolean;
  readonly theme: TailwindTheme | null;
}

interface ScaleLayer {
  readonly authored: Readonly<Record<string, string>>;
  readonly computed: Readonly<Record<string, string>>;
  readonly isRoot: boolean;
  readonly site: ScaleSite;
}

interface ScaleOptions {
  readonly factor: number;
  readonly shouldKeepTokens: boolean;
}

interface ScaledStyles {
  readonly style: Readonly<Record<string, string>>;
  readonly tokens: readonly ScaleProperty[];
  readonly tooLong: readonly ScaleProperty[];
}

const VALUE_LIMIT = 200;

const SCALE_SET: ReadonlySet<string> = new Set(SCALE_PROPERTIES);

const SHORTHANDS: ReadonlyMap<string, readonly ScaleProperty[]> = new Map([
  [
    "padding",
    ["padding-top", "padding-right", "padding-bottom", "padding-left"],
  ],
  ["margin", ["margin-top", "margin-right", "margin-bottom", "margin-left"]],
  ["gap", [ROW_GAP, COLUMN_GAP]],
  ["border-top-left-radius", [RADIUS]],
  ["border-top-right-radius", [RADIUS]],
  ["border-bottom-right-radius", [RADIUS]],
  ["border-bottom-left-radius", [RADIUS]],
]);

const LOOSE_SUFFIXES: ReadonlySet<string> = new Set([
  "auto",
  "full",
  "screen",
  "svh",
  "lvh",
  "dvh",
  "svw",
  "lvw",
  "dvw",
  "min",
  "max",
  "fit",
  "none",
]);

const ABSOLUTE_LENGTH = /\d(?:px|rem)\b/u;

const PLAIN_STEP = /^\d+(?:\.\d+)?$/u;

const TOKEN_PATTERN = /var\(|\(--/u;

const isScaleProperty = (property: string): property is ScaleProperty =>
  SCALE_SET.has(property);

const toScaleProperties = (properties: readonly string[]): ScaleProperty[] =>
  properties.flatMap((property) => {
    const expanded = SHORTHANDS.get(property);

    if (expanded) {
      return [...expanded];
    }

    if (isScaleProperty(property)) {
      return [property];
    }

    return [];
  });

const toSuffix = (parsed: ParsedClass, cls: Classified): string => {
  if (cls.kind === "sided") {
    return cls.value.suffix;
  }

  const dash = parsed.utility.indexOf("-");

  if (dash === -1) {
    return "";
  }

  return parsed.utility.slice(dash + 1);
};

const isLooseSuffix = (suffix: string): boolean =>
  LOOSE_SUFFIXES.has(suffix) || suffix.includes("/") || suffix.includes("%");

const isArbitraryLength = (suffix: string): boolean =>
  suffix.startsWith("[") && ABSOLUTE_LENGTH.test(suffix);

const toSingleKind = (group: string, suffix: string): SourceKind | null => {
  if (group === "leading") {
    if (PLAIN_STEP.test(suffix) || isArbitraryLength(suffix)) {
      return "length";
    }

    return null;
  }

  if (group === "tracking") {
    if (isArbitraryLength(suffix)) {
      return "length";
    }

    return null;
  }

  return "length";
};

const toClassKind = (
  parsed: ParsedClass,
  cls: Classified
): SourceKind | null => {
  const suffix = toSuffix(parsed, cls);

  if (TOKEN_PATTERN.test(suffix)) {
    return "token";
  }

  if (isLooseSuffix(suffix)) {
    return null;
  }

  if (cls.kind === "sided") {
    return "length";
  }

  return toSingleKind(cls.group, suffix);
};

const setClassKind = (
  kinds: Map<ScaleProperty, SourceKind>,
  properties: readonly ScaleProperty[],
  kind: SourceKind | null
): void => {
  for (const property of properties) {
    if (kind === null) {
      kinds.delete(property);
    } else {
      kinds.set(property, kind);
    }
  }
};

const toClassKinds = (site: ScaleSite): Map<ScaleProperty, SourceKind> => {
  const kinds = new Map<ScaleProperty, SourceKind>();

  for (const raw of site.classes) {
    const parsed = parseClass(raw);
    const cls = classify(parsed, site.theme);

    if (parsed.variants === "" && cls !== null) {
      setClassKind(
        kinds,
        toScaleProperties(classProps(cls)),
        toClassKind(parsed, cls)
      );
    }
  }

  return kinds;
};

const toAuthoredKind = (text: string): SourceKind | null => {
  if (TOKEN_PATTERN.test(text)) {
    return "token";
  }

  if (ABSOLUTE_LENGTH.test(text) || text.trim() === "0") {
    return "length";
  }

  return null;
};

const toCssKinds = (
  authored: Readonly<Record<string, string>>
): Map<ScaleProperty, SourceKind> => {
  const kinds = new Map<ScaleProperty, SourceKind>();

  for (const property of SCALE_PROPERTIES) {
    const kind = toAuthoredKind(authored[property] ?? "");

    if (kind !== null) {
      kinds.set(property, kind);
    }
  }

  return kinds;
};

const toSiteKinds = (layer: ScaleLayer): Map<ScaleProperty, SourceKind> => {
  if (layer.site.isTailwind) {
    return toClassKinds(layer.site);
  }

  return toCssKinds(layer.authored);
};

const toKinds = (layer: ScaleLayer): Map<ScaleProperty, SourceKind> => {
  const kinds = toSiteKinds(layer);

  if (layer.isRoot && !kinds.has(FONT_SIZE)) {
    kinds.set(FONT_SIZE, "length");
  }

  return kinds;
};

const GAP_SIDES: readonly string[] = [ROW_GAP, COLUMN_GAP];

const toJoinedGap = (style: Record<string, string>): void => {
  const row = style[ROW_GAP] ?? "";

  if (row === "" || row !== style[COLUMN_GAP]) {
    return;
  }

  for (const side of GAP_SIDES) {
    Reflect.deleteProperty(style, side);
  }

  style.gap = row;
};

const toSnapTheme = (site: ScaleSite): TailwindTheme | null => {
  if (site.isTailwind) {
    return site.theme;
  }

  return null;
};

const toScaledStyles = (
  layer: ScaleLayer,
  options: ScaleOptions
): ScaledStyles => {
  const style: Record<string, string> = {};
  const tokens: ScaleProperty[] = [];
  const tooLong: ScaleProperty[] = [];
  const theme = toSnapTheme(layer.site);

  for (const [property, kind] of toKinds(layer)) {
    if (kind === "token") {
      tokens.push(property);
    }

    const computed = layer.computed[property] ?? "";
    const next = toScaledValue(property, computed, options.factor, theme);
    const isKept = kind === "token" && options.shouldKeepTokens;
    const isChanged = next !== null && next !== computed.trim() && !isKept;

    if (isChanged && next.length > VALUE_LIMIT) {
      tooLong.push(property);
    }

    if (isChanged && next.length <= VALUE_LIMIT) {
      style[property] = next;
    }
  }

  toJoinedGap(style);

  return { style, tokens, tooLong };
};

export { SCALE_PROPERTIES, toScaledStyles };

export type {
  ScaleLayer,
  ScaleOptions,
  ScaleProperty,
  ScaleSite,
  ScaledStyles,
};
