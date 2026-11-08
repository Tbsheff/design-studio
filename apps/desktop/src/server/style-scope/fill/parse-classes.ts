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

const toUnarbitrary = (value: string): string => value.replaceAll("_", " ");

const toPaintOfValue = (value: string): FillPaint => {
  const inner = ARBITRARY.exec(value)?.groups?.["value"];

  if (inner) {
    return paintFromCss(toUnarbitrary(inner));
  }

  return tokenPaint(`--color-${value}`);
};

const toReadStopToken = (out: StopParts, value: string): void => {
  const pct = POSITION.exec(value)?.groups?.["pct"];

  if (pct) {
    out.position = Number(pct);

    return;
  }

  out.paint = toPaintOfValue(value);
};

const stopParts = (classes: readonly string[], kind: StopKind): StopParts => {
  const out: StopParts = { paint: null, position: null };
  const prefix = `${kind}-`;

  for (const token of classes) {
    if (token.startsWith(prefix)) {
      toReadStopToken(out, token.slice(prefix.length));
    }
  }

  return out;
};

const toStopsOf = (classes: readonly string[]): FillStop[] =>
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

const toSideAngle = (side: string): number | null =>
  SIDE_ANGLE.get(`to ${SIDES.get(side) ?? side}`) ?? null;

const toAngleOfRest = (rest: string): number => {
  const side = SIDE_REST.exec(rest)?.groups?.["side"];

  if (side) {
    return toSideAngle(side) ?? DEFAULT_ANGLE;
  }

  const inner = ARBITRARY.exec(rest)?.groups?.["value"] ?? rest;

  return Number(inner.replace(/deg$/u, "")) || 0;
};

const toSigned = (angle: number, negative: boolean): number => {
  if (negative) {
    return -angle;
  }

  return angle;
};

const toLinearAngle = (token: string): number | null => {
  const found = LINEAR.exec(token)?.groups;
  const rest = found?.["rest"];

  if (rest) {
    return toSigned(toAngleOfRest(rest), Boolean(found["neg"]));
  }

  const side = V3_LINEAR.exec(token)?.groups?.["side"];

  if (side) {
    return toSideAngle(side);
  }

  return null;
};

const toFormOf = (text: string): RadialForm => {
  if (text.startsWith("circle")) {
    return "circle";
  }

  return "ellipse";
};

const toAtOf = (text: string): string | null => {
  const index = text.indexOf(AT_PREFIX);

  if (index === -1) {
    return null;
  }

  return text.slice(index + AT_PREFIX.length).trim();
};

const toRadialFrom = (
  head: string | undefined,
  found: FillStop[]
): FillSpec => {
  const text = toUnarbitrary(head ?? "ellipse");

  return {
    at: toAtOf(text),
    form: toFormOf(text),
    stops: found,
    type: "radial",
  };
};

const toGradientOfToken = (
  token: string,
  classes: readonly string[]
): FillSpec | null => {
  const arbitraryValue = ARBITRARY_BG.exec(token)?.groups?.["value"];

  if (arbitraryValue) {
    return parseGradient(toUnarbitrary(arbitraryValue));
  }

  const angle = toLinearAngle(token);

  if (angle !== null) {
    return { angle, stops: toStopsOf(classes), type: "linear" };
  }

  const radial = RADIAL.exec(token);

  if (radial) {
    return toRadialFrom(radial.groups?.["head"], toStopsOf(classes));
  }

  return null;
};

const toGradientOf = (classes: readonly string[]): FillSpec | null => {
  for (const token of classes) {
    const found = toGradientOfToken(token, classes);

    if (found) {
      return found;
    }
  }

  return null;
};

const toBlendOfToken = (token: string): FillBlend[] =>
  Object.entries(BLEND_PREFIX).flatMap(([property, prefix]) => {
    const mode = token.slice(prefix.length);

    if (!token.startsWith(prefix) || !MODES.has(mode)) {
      return [];
    }

    return [{ mode: mode as BlendMode, property: property as BlendProperty }];
  });

const toBlendOf = (classes: readonly string[]): FillBlend[] =>
  classes.flatMap((token) => toBlendOfToken(token));

export {
  toBlendOf as blendOf,
  toGradientOf as gradientOf,
  toPaintOfValue as paintOfValue,
};
