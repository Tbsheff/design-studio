import type { FillPaint, FillSpec, FillStop, RadialForm } from "./deps.js";
import { tokenPaint, VAR_REF } from "./tokens.js";

const GRADIENT = /^(?<kind>linear|radial)-gradient\((?<body>[\s\S]*)\)$/u;

const ANGLE = /^(?<deg>-?\d+(?:\.\d+)?)deg$/u;

const POSITION = /^(?<pct>-?\d+(?:\.\d+)?)%$/u;

const RADIAL_HEAD = /^(?:circle|ellipse|at\s)/u;

const QUARTER = 90;
const EIGHTH = 45;
const TOP = 0;
const RIGHT = QUARTER;
const BOTTOM = QUARTER * 2;
const THREE_QUARTERS = 3;
const LEFT = QUARTER * THREE_QUARTERS;
const TOP_RIGHT = EIGHTH;
const BOTTOM_RIGHT = RIGHT + EIGHTH;
const BOTTOM_LEFT = BOTTOM + EIGHTH;
const TOP_LEFT = LEFT + EIGHTH;

const AT_PREFIX = "at ";

const SIDE_ANGLE = new Map<string, number>([
  ["to bottom", BOTTOM],
  ["to bottom left", BOTTOM_LEFT],
  ["to bottom right", BOTTOM_RIGHT],
  ["to left", LEFT],
  ["to left bottom", BOTTOM_LEFT],
  ["to left top", TOP_LEFT],
  ["to right", RIGHT],
  ["to right bottom", BOTTOM_RIGHT],
  ["to right top", TOP_RIGHT],
  ["to top", TOP],
  ["to top left", TOP_LEFT],
  ["to top right", TOP_RIGHT],
]);

const DEFAULT_ANGLE = BOTTOM;

const stopText = (stop: FillStop): string => {
  if (stop.position === null) {
    return stop.color;
  }

  return `${stop.color} ${stop.position}%`;
};

const toStopsText = (stops: readonly FillStop[]): string =>
  stops.map((stop) => stopText(stop)).join(", ");

const toRadialHead = (form: RadialForm, at: string | null): string => {
  if (at) {
    return `${form} at ${at}`;
  }

  return form;
};

const toGradientCss = (fill: FillSpec): string | null => {
  if (fill.type === "linear") {
    return `linear-gradient(${fill.angle}deg, ${toStopsText(fill.stops)})`;
  }

  if (fill.type === "radial") {
    const head = toRadialHead(fill.form, fill.at);

    return `radial-gradient(${head}, ${toStopsText(fill.stops)})`;
  }

  return null;
};

const toDepthStep = (char: string): number => {
  if (char === "(") {
    return 1;
  }

  if (char === ")") {
    return -1;
  }

  return 0;
};

const toSplitTop = (text: string, separator: RegExp): string[] => {
  const out: string[] = [];
  let depth = 0;
  let current = "";

  for (const char of text) {
    depth += toDepthStep(char);

    if (depth === 0 && separator.test(char)) {
      out.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  out.push(current.trim());

  return out.filter((part) => part !== "");
};

const toPaintFromCss = (raw: string): FillPaint => {
  const color = raw.trim();
  const name = VAR_REF.exec(color)?.groups?.["name"];

  if (name) {
    return tokenPaint(name);
  }

  return { color, token: null };
};

const stopFromCss = (raw: string): FillStop => {
  const parts = toSplitTop(raw, /\s/u);
  const last = parts.at(-1) ?? "";
  const pct = POSITION.exec(last)?.groups?.["pct"];

  if (pct && parts.length > 1) {
    const paint = toPaintFromCss(parts.slice(0, -1).join(" "));

    return { color: paint.color, position: Number(pct), token: paint.token };
  }

  const paint = toPaintFromCss(raw);

  return { color: paint.color, position: null, token: paint.token };
};

const toLinearAngle = (head: string): number | null => {
  const deg = ANGLE.exec(head)?.groups?.["deg"];

  if (deg) {
    return Number(deg);
  }

  return SIDE_ANGLE.get(head.replaceAll(/\s+/gu, " ")) ?? null;
};

const toStopsFrom = (parts: readonly string[]): FillStop[] =>
  parts.map((part) => stopFromCss(part));

const toLinearFrom = (parts: string[]): FillSpec => {
  const angle = toLinearAngle(parts[0] ?? "");

  if (angle === null) {
    return { angle: DEFAULT_ANGLE, stops: toStopsFrom(parts), type: "linear" };
  }

  return { angle, stops: toStopsFrom(parts.slice(1)), type: "linear" };
};

const toRadialForm = (head: string): RadialForm => {
  if (head.startsWith("circle")) {
    return "circle";
  }

  return "ellipse";
};

const toRadialAt = (head: string): string | null => {
  const index = head.indexOf(AT_PREFIX);

  if (index === -1) {
    return null;
  }

  return head.slice(index + AT_PREFIX.length).trim() || null;
};

const toRadialFrom = (parts: string[]): FillSpec => {
  const head = parts[0] ?? "";

  if (!RADIAL_HEAD.test(head)) {
    return {
      at: null,
      form: "ellipse",
      stops: toStopsFrom(parts),
      type: "radial",
    };
  }

  return {
    at: toRadialAt(head),
    form: toRadialForm(head),
    stops: toStopsFrom(parts.slice(1)),
    type: "radial",
  };
};

const toParseGradient = (raw: string): FillSpec | null => {
  const found = GRADIENT.exec(raw.trim());
  const body = found?.groups?.["body"];

  if (!body) {
    return null;
  }

  const parts = toSplitTop(body, /,/u);

  if (found?.groups?.["kind"] === "linear") {
    return toLinearFrom(parts);
  }

  return toRadialFrom(parts);
};

export {
  AT_PREFIX,
  DEFAULT_ANGLE,
  toGradientCss as gradientCss,
  toPaintFromCss as paintFromCss,
  toParseGradient as parseGradient,
  SIDE_ANGLE,
  toSplitTop as splitTop,
};
