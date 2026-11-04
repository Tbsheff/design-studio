import { BLEND_PREFIX } from "./classes.js";
import {
  AT_PREFIX,
  DEFAULT_ANGLE,
  paintFromCss,
  parseGradient,
  SIDE_ANGLE,
} from "./css.js";
import { BLEND_MODES } from "./deps.js";
import type {
  BlendMode,
  BlendProperty,
  FillBlend,
  FillPaint,
  FillSpec,
  FillStop,
  RadialForm,
} from "./deps.js";
import { tokenPaint } from "./tokens.js";

const ARBITRARY = /^\[(?<value>.+)\]$/u;

const POSITION = /^(?<pct>-?\d+(?:\.\d+)?)%$/u;

const LINEAR = /^(?<neg>-)?bg-linear-(?<rest>.+)$/u;

const SIDE_REST = /^to-(?<side>[a-z]+)$/u;

const V3_LINEAR = /^bg-gradient-to-(?<side>[a-z]+)$/u;

const RADIAL = /^bg-radial(?:-\[(?<head>.+)\])?$/u;

const ARBITRARY_BG =
  /^bg-\[(?:image:)?(?<value>(?:linear|radial)-gradient\(.+\))\]$/u;

const SIDES = new Map<string, string>([
  ["b", "bottom"],
  ["bl", "bottom left"],
  ["br", "bottom right"],
  ["l", "left"],
  ["r", "right"],
  ["t", "top"],
  ["tl", "top left"],
  ["tr", "top right"],
]);

const STOP_KINDS = ["from", "via", "to"] as const;

const MODES = new Set<string>(BLEND_MODES);

type StopKind = (typeof STOP_KINDS)[number];

interface StopParts {
  paint: FillPaint | null;
  position: number | null;
}

const unarbitrary = (value: string): string => value.replaceAll("_", " ");

const paintOfValue = (value: string): FillPaint => {
  const inner = ARBITRARY.exec(value)?.groups?.["value"];

  if (inner) {
    return paintFromCss(unarbitrary(inner));
  }

  return tokenPaint(`--color-${value}`);
};

const readStopToken = (out: StopParts, value: string): void => {
  const pct = POSITION.exec(value)?.groups?.["pct"];

  if (pct) {
    out.position = Number(pct);

    return;
  }

  out.paint = paintOfValue(value);
};

const stopParts = (classes: readonly string[], kind: StopKind): StopParts => {
  const out: StopParts = { paint: null, position: null };
  const prefix = `${kind}-`;

  for (const token of classes) {
    if (token.startsWith(prefix)) {
      readStopToken(out, token.slice(prefix.length));
    }
  }

  return out;
};

const stopsOf = (classes: readonly string[]): FillStop[] =>
  STOP_KINDS.flatMap((kind) => {
    const parts = stopParts(classes, kind);

    if (!parts.paint) {
      return [];
    }

    return [
      {
        color: parts.paint.color,
        position: parts.position,
        token: parts.paint.token,
      },
    ];
  });

const sideAngle = (side: string): number | null =>
  SIDE_ANGLE.get(`to ${SIDES.get(side) ?? side}`) ?? null;

const angleOfRest = (rest: string): number => {
  const side = SIDE_REST.exec(rest)?.groups?.["side"];

  if (side) {
    return sideAngle(side) ?? DEFAULT_ANGLE;
  }

  const inner = ARBITRARY.exec(rest)?.groups?.["value"] ?? rest;

  return Number(inner.replace(/deg$/u, "")) || 0;
};

const signed = (angle: number, negative: boolean): number => {
  if (negative) {
    return -angle;
  }

  return angle;
};

const linearAngle = (token: string): number | null => {
  const found = LINEAR.exec(token)?.groups;
  const rest = found?.["rest"];

  if (rest) {
    return signed(angleOfRest(rest), Boolean(found["neg"]));
  }

  const side = V3_LINEAR.exec(token)?.groups?.["side"];

  if (side) {
    return sideAngle(side);
  }

  return null;
};

const formOf = (text: string): RadialForm => {
  if (text.startsWith("circle")) {
    return "circle";
  }

  return "ellipse";
};

const atOf = (text: string): string | null => {
  const index = text.indexOf(AT_PREFIX);

  if (index === -1) {
    return null;
  }

  return text.slice(index + AT_PREFIX.length).trim();
};

const radialFrom = (head: string | undefined, found: FillStop[]): FillSpec => {
  const text = unarbitrary(head ?? "ellipse");

  return { at: atOf(text), form: formOf(text), stops: found, type: "radial" };
};

const gradientOfToken = (
  token: string,
  classes: readonly string[]
): FillSpec | null => {
  const arbitraryValue = ARBITRARY_BG.exec(token)?.groups?.["value"];

  if (arbitraryValue) {
    return parseGradient(unarbitrary(arbitraryValue));
  }

  const angle = linearAngle(token);

  if (angle !== null) {
    return { angle, stops: stopsOf(classes), type: "linear" };
  }

  const radial = RADIAL.exec(token);

  if (radial) {
    return radialFrom(radial.groups?.["head"], stopsOf(classes));
  }

  return null;
};

const gradientOf = (classes: readonly string[]): FillSpec | null => {
  for (const token of classes) {
    const found = gradientOfToken(token, classes);

    if (found) {
      return found;
    }
  }

  return null;
};

const blendOfToken = (token: string): FillBlend[] =>
  Object.entries(BLEND_PREFIX).flatMap(([property, prefix]) => {
    const mode = token.slice(prefix.length);

    if (!token.startsWith(prefix) || !MODES.has(mode)) {
      return [];
    }

    return [{ mode: mode as BlendMode, property: property as BlendProperty }];
  });

const blendOf = (classes: readonly string[]): FillBlend[] =>
  classes.flatMap((token) => blendOfToken(token));

export { blendOf, gradientOf, paintOfValue };
