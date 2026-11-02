import { gradientCss } from "./css.js";
import { classify, classProps, parseClass } from "./deps.js";
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

const arbitrary = (value: string): string =>
  value.replaceAll(", ", ",").replaceAll(/\s+/gu, "_");

const colorClass = (
  prefix: string,
  paint: FillPaint,
  theme: TailwindTheme
): string => {
  if (paint.token && theme.colorNames.has(paint.token)) {
    return `${prefix}-${paint.token}`;
  }

  return `${prefix}-[${arbitrary(paint.color)}]`;
};

const stopClasses = (
  prefix: string,
  stop: FillStop,
  theme: TailwindTheme
): string[] => {
  const out = [colorClass(prefix, stop, theme)];

  if (stop.position !== null) {
    out.push(`${prefix}-${stop.position}%`);
  }

  return out;
};

const linearHead = (angle: number): string => {
  if (!Number.isInteger(angle)) {
    return `bg-linear-[${angle}deg]`;
  }

  if (angle < 0) {
    return `-bg-linear-${-angle}`;
  }

  return `bg-linear-${angle}`;
};

const radialText = (fill: RadialFill): string => {
  if (fill.at) {
    return `${fill.form} at ${fill.at}`;
  }

  return fill.form;
};

const radialHead = (fill: RadialFill): string => {
  if (fill.form === "ellipse" && !fill.at) {
    return "bg-radial";
  }

  return `bg-radial-[${arbitrary(radialText(fill))}]`;
};

const middleStops = (
  stops: readonly FillStop[],
  theme: TailwindTheme
): string[] => {
  const [, middle] = stops;

  if (stops.length !== TAILWIND_STOPS_MAX || !middle) {
    return [];
  }

  return stopClasses("via", middle, theme);
};

const gradientStops = (
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
    ...middleStops(stops, theme),
    ...stopClasses("to", last, theme),
  ];
};

const arbitraryGradient = (fill: FillSpec): string[] => {
  const css = gradientCss(fill) ?? "";
  const cls = `bg-[${arbitrary(css)}]`;

  if (cls.length > CLASS_MAX) {
    throw new FillError(
      "This gradient is too long for one Tailwind class. Use fewer stops or color tokens."
    );
  }

  return [cls];
};

const gradientHead = (fill: LinearFill | RadialFill): string => {
  if (fill.type === "linear") {
    return linearHead(fill.angle);
  }

  return radialHead(fill);
};

const fillClasses = (fill: FillSpec, theme: TailwindTheme): string[] => {
  if (fill.type === "solid") {
    return [colorClass("bg", fill.paint, theme)];
  }

  if (theme.version !== TAILWIND_GRADIENT_VERSION) {
    return arbitraryGradient(fill);
  }

  if (fill.stops.length > TAILWIND_STOPS_MAX) {
    return arbitraryGradient(fill);
  }

  return [gradientHead(fill), ...gradientStops(fill.stops, theme)];
};

const blendClass = (blend: FillBlend): string =>
  `${BLEND_PREFIX[blend.property]}${blend.mode}`;

const isBackgroundClass = (token: string, theme: TailwindTheme): boolean => {
  const parsed = parseClass(token);

  if (parsed.variants !== "" || parsed.utility.includes("url(")) {
    return false;
  }

  if (GRADIENT_CLASS.test(token) || STOP_CLASS.test(parsed.utility)) {
    return true;
  }

  const cls = classify(parsed, theme);

  return Boolean(cls && classProps(cls).some((prop) => BG_PROPS.has(prop)));
};

const isBlendClass = (token: string, blend: FillBlend | null): boolean =>
  blend !== null && token.startsWith(BLEND_PREFIX[blend.property]);

const planClasses = (
  current: readonly string[],
  fill: FillSpec,
  blend: FillBlend | null,
  theme: TailwindTheme
): ClassChanges => {
  const wanted = fillClasses(fill, theme);

  if (blend) {
    wanted.push(blendClass(blend));
  }

  const keep = new Set(wanted);
  const have = new Set(current);

  const remove = current.filter(
    (token) =>
      !keep.has(token) &&
      (isBackgroundClass(token, theme) || isBlendClass(token, blend))
  );

  return { add: wanted.filter((token) => !have.has(token)), remove };
};

export { arbitrary, BLEND_PREFIX, isBackgroundClass, planClasses };

export type { ClassChanges };
