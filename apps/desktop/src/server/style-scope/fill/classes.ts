import { gradientCss } from "./css.js";
import { classify, classProps, normalizeVariant, parseClass } from "./deps.js";
import type {
  FillBlend,
  FillPaint,
  FillSpec,
  FillStop,
  LinearFill,
  RadialFill,
  TailwindTheme,
} from "./deps.js";
import { FillError } from "./errors.js";

interface ClassChanges {
  add: string[];
  remove: string[];
}

interface FillPaintPlan {
  blend: FillBlend | null;
  fill: FillSpec;
  variant: string;
}

const CLASS_MAX = 100;

const TAILWIND_STOPS_MAX = 3;

const TAILWIND_GRADIENT_VERSION = 4;

const GRADIENT_CLASS = /^-?bg-(?:linear|radial|conic|gradient)(?:-|$)/u;

const STOP_CLASS = /^(?:from|via|to)-/u;

const BG_PROPS = new Set(["background-color", "background-image"]);

const BLEND_PREFIX = {
  "background-blend-mode": "bg-blend-",
  "mix-blend-mode": "mix-blend-",
} as const;

const toArbitrary = (value: string): string =>
  value.replaceAll(", ", ",").replaceAll(/\s+/gu, "_");

const toColorClass = (
  prefix: string,
  paint: FillPaint,
  theme: TailwindTheme
): string => {
  if (paint.token && theme.colorNames.has(paint.token)) {
    return `${prefix}-${paint.token}`;
  }

  return `${prefix}-[${toArbitrary(paint.color)}]`;
};

const stopClasses = (
  prefix: string,
  stop: FillStop,
  theme: TailwindTheme
): string[] => {
  const out = [toColorClass(prefix, stop, theme)];

  if (stop.position !== null) {
    out.push(`${prefix}-${stop.position}%`);
  }

  return out;
};

const toLinearHead = (angle: number): string => {
  if (!Number.isInteger(angle)) {
    return `bg-linear-[${angle}deg]`;
  }

  if (angle < 0) {
    return `-bg-linear-${-angle}`;
  }

  return `bg-linear-${angle}`;
};

const toRadialText = (fill: RadialFill): string => {
  if (fill.at) {
    return `${fill.form} at ${fill.at}`;
  }

  return fill.form;
};

const toRadialHead = (fill: RadialFill): string => {
  if (fill.form === "ellipse" && !fill.at) {
    return "bg-radial";
  }

  return `bg-radial-[${toArbitrary(toRadialText(fill))}]`;
};

const toMiddleStops = (
  stops: readonly FillStop[],
  theme: TailwindTheme
): string[] => {
  const [, middle] = stops;

  if (stops.length !== TAILWIND_STOPS_MAX || !middle) {
    return [];
  }

  return stopClasses("via", middle, theme);
};

const toGradientStops = (
  stops: readonly FillStop[],
  theme: TailwindTheme
): string[] => {
  const [first] = stops;
  const last = stops.at(-1);

  if (!first || !last) {
    return [];
  }

  return [
    ...stopClasses("from", first, theme),
    ...toMiddleStops(stops, theme),
    ...stopClasses("to", last, theme),
  ];
};

const toArbitraryGradient = (fill: FillSpec): string[] => {
  const css = gradientCss(fill) ?? "";
  const cls = `bg-[${toArbitrary(css)}]`;

  if (cls.length > CLASS_MAX) {
    throw new FillError(
      "This gradient is too long for one Tailwind class. Use fewer stops or color tokens."
    );
  }

  return [cls];
};

const toGradientHead = (fill: LinearFill | RadialFill): string => {
  if (fill.type === "linear") {
    return toLinearHead(fill.angle);
  }

  return toRadialHead(fill);
};

const toFillClasses = (fill: FillSpec, theme: TailwindTheme): string[] => {
  if (fill.type === "solid") {
    return [toColorClass("bg", fill.paint, theme)];
  }

  if (theme.version !== TAILWIND_GRADIENT_VERSION) {
    return toArbitraryGradient(fill);
  }

  if (fill.stops.length > TAILWIND_STOPS_MAX) {
    return toArbitraryGradient(fill);
  }

  return [toGradientHead(fill), ...toGradientStops(fill.stops, theme)];
};

const toBlendClass = (blend: FillBlend): string =>
  `${BLEND_PREFIX[blend.property]}${blend.mode}`;

const isBackgroundUtility = (
  token: string,
  theme: TailwindTheme,
  variant: string
): boolean => {
  const parsed = parseClass(token);

  const same =
    parsed.variants === variant ||
    normalizeVariant(parsed.variants) === variant;

  if (!same || parsed.utility.includes("url(")) {
    return false;
  }

  const bare = token.slice(parsed.variants.length);

  if (GRADIENT_CLASS.test(bare) || STOP_CLASS.test(parsed.utility)) {
    return true;
  }

  const cls = classify(parseClass(bare), theme);

  return Boolean(cls && classProps(cls).some((prop) => BG_PROPS.has(prop)));
};

const isBackgroundClass = (token: string, theme: TailwindTheme): boolean =>
  isBackgroundUtility(token, theme, "");

const isBlendClass = (token: string, paint: FillPaintPlan): boolean =>
  paint.blend !== null &&
  token.startsWith(`${paint.variant}${BLEND_PREFIX[paint.blend.property]}`);

const toWantedClasses = (
  paint: FillPaintPlan,
  theme: TailwindTheme
): string[] => {
  const wanted = toFillClasses(paint.fill, theme);

  if (paint.blend) {
    wanted.push(toBlendClass(paint.blend));
  }

  const prefixed = wanted.map((token) => `${paint.variant}${token}`);

  if (prefixed.some((token) => token.length > CLASS_MAX)) {
    throw new FillError(
      "This gradient is too long for one Tailwind class. Use fewer stops or color tokens."
    );
  }

  return prefixed;
};

const toPlanClasses = (
  current: readonly string[],
  paint: FillPaintPlan,
  theme: TailwindTheme
): ClassChanges => {
  const wanted = toWantedClasses(paint, theme);
  const keep = new Set(wanted);
  const have = new Set(current);

  const remove = current.filter(
    (token) =>
      !keep.has(token) &&
      (isBackgroundUtility(token, theme, paint.variant) ||
        isBlendClass(token, paint))
  );

  return { add: wanted.filter((token) => !have.has(token)), remove };
};

export {
  toArbitrary as arbitrary,
  BLEND_PREFIX,
  isBackgroundClass,
  toPlanClasses as planClasses,
};

export type { ClassChanges, FillPaintPlan };
