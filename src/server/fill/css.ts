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

const stopsText = (stops: readonly FillStop[]): string =>
  stops.map((stop) => stopText(stop)).join(", ");

const radialHead = (form: RadialForm, at: string | null): string => {
  if (at) {
    return `${form} at ${at}`;
  }

  return form;
};

const gradientCss = (fill: FillSpec): string | null => {
  if (fill.type === "linear") {
    return `linear-gradient(${fill.angle}deg, ${stopsText(fill.stops)})`;
  }

  if (fill.type === "radial") {
    const head = radialHead(fill.form, fill.at);

    return `radial-gradient(${head}, ${stopsText(fill.stops)})`;
  }

  return null;
};

const depthStep = (char: string): number => {
  if (char === "(") {
    return 1;
  }

  if (char === ")") {
    return -1;
  }

  return 0;
};

const splitTop = (text: string, separator: RegExp): string[] => {
  const out: string[] = [];
  let depth = 0;
  let current = "";

  for (const char of text) {
    depth += depthStep(char);

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

const paintFromCss = (raw: string): FillPaint => {
  const color = raw.trim();
  const name = VAR_REF.exec(color)?.groups?.["name"];

  if (name) {
    return tokenPaint(name);
  }

  return { color, token: null };
};

const stopFromCss = (raw: string): FillStop => {
  const parts = splitTop(raw, /\s/u);
  const last = parts.at(-1) ?? "";
  const pct = POSITION.exec(last)?.groups?.["pct"];

  if (pct && parts.length > 1) {
    const paint = paintFromCss(parts.slice(0, -1).join(" "));

    return { color: paint.color, position: Number(pct), token: paint.token };
  }

  const paint = paintFromCss(raw);

  return { color: paint.color, position: null, token: paint.token };
};

const linearAngle = (head: string): number | null => {
  const deg = ANGLE.exec(head)?.groups?.["deg"];

  if (deg) {
    return Number(deg);
  }

  return SIDE_ANGLE.get(head.replaceAll(/\s+/gu, " ")) ?? null;
};

const stopsFrom = (parts: readonly string[]): FillStop[] =>
  parts.map((part) => stopFromCss(part));

const linearFrom = (parts: string[]): FillSpec => {
  const angle = linearAngle(parts[0] ?? "");

  if (angle === null) {
    return { angle: DEFAULT_ANGLE, stops: stopsFrom(parts), type: "linear" };
  }

  return { angle, stops: stopsFrom(parts.slice(1)), type: "linear" };
};

const radialForm = (head: string): RadialForm => {
  if (head.startsWith("circle")) {
    return "circle";
  }

  return "ellipse";
};

const radialAt = (head: string): string | null => {
  const index = head.indexOf(AT_PREFIX);

  if (index === -1) {
    return null;
  }

  return head.slice(index + AT_PREFIX.length).trim() || null;
};

const radialFrom = (parts: string[]): FillSpec => {
  const head = parts[0] ?? "";

  if (!RADIAL_HEAD.test(head)) {
    return {
      at: null,
      form: "ellipse",
      stops: stopsFrom(parts),
      type: "radial",
    };
  }

  return {
    at: radialAt(head),
    form: radialForm(head),
    stops: stopsFrom(parts.slice(1)),
    type: "radial",
  };
};

const parseGradient = (raw: string): FillSpec | null => {
  const found = GRADIENT.exec(raw.trim());
  const body = found?.groups?.["body"];

  if (!body) {
    return null;
  }

  const parts = splitTop(body, /,/u);

  if (found?.groups?.["kind"] === "linear") {
    return linearFrom(parts);
  }

  return radialFrom(parts);
};

export {
  AT_PREFIX,
  DEFAULT_ANGLE,
  gradientCss,
  paintFromCss,
  parseGradient,
  SIDE_ANGLE,
  splitTop,
};
