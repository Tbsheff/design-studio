import { lengthPx, toOklchColor } from "./deps.js";

interface TokenValue {
  readonly name: string;
  readonly value: string | null;
}

interface TokenOutcome {
  readonly from: string;
  readonly note: string;
  readonly to: string | null;
}

type Measure =
  | {
      readonly kind: "color";
      readonly point: readonly [number, number, number];
    }
  | { readonly kind: "length"; readonly px: number };

interface Nearest {
  readonly distance: number;
  readonly token: TokenValue;
}

const COLOR_REACH = 0.1;

const LENGTH_REACH_PX = 2;

const LENGTH_REACH_RATIO = 0.25;

const HALF_TURN_DEGREES = 180;

const toMeasure = (value: string | null): Measure | null => {
  if (value === null) {
    return null;
  }

  const color = toOklchColor(value);

  if (color !== null) {
    const hue = ((color.h ?? 0) * Math.PI) / HALF_TURN_DEGREES;

    return {
      kind: "color",
      point: [color.l, color.c * Math.cos(hue), color.c * Math.sin(hue)],
    };
  }

  const px = lengthPx(value);

  if (Number.isFinite(px)) {
    return { kind: "length", px };
  }

  return null;
};

const toDistance = (left: Measure, right: Measure): number | null => {
  if (left.kind === "color" && right.kind === "color") {
    return Math.hypot(
      left.point[0] - right.point[0],
      left.point[1] - right.point[1],
      left.point[2] - right.point[2]
    );
  }

  if (left.kind === "length" && right.kind === "length") {
    return Math.abs(left.px - right.px);
  }

  return null;
};

const isNear = (left: Measure, distance: number): boolean => {
  if (left.kind === "color") {
    return distance <= COLOR_REACH;
  }

  return (
    distance <=
    Math.max(LENGTH_REACH_PX, Math.abs(left.px) * LENGTH_REACH_RATIO)
  );
};

const toNearest = (
  measure: Measure,
  target: readonly TokenValue[]
): Nearest | null => {
  let best: Nearest | null = null;

  for (const token of target) {
    const other = toMeasure(token.value);

    if (other !== null) {
      const distance = toDistance(measure, other);

      if (distance !== null && (best === null || distance < best.distance)) {
        best = { distance, token };
      }
    }
  }

  return best;
};

const toOutcome = (
  token: TokenValue,
  target: readonly TokenValue[]
): TokenOutcome => {
  if (target.some((other) => other.name === token.name)) {
    return { from: token.name, note: "", to: token.name };
  }

  const measure = toMeasure(token.value);

  if (measure === null) {
    return {
      from: token.name,
      note: "the pattern has no value for this token, so no match was possible",
      to: null,
    };
  }

  const nearest = toNearest(measure, target);

  if (nearest === null) {
    return {
      from: token.name,
      note: "the project has no token with a comparable value",
      to: null,
    };
  }

  if (!isNear(measure, nearest.distance)) {
    return {
      from: token.name,
      note: `the nearest token ${nearest.token.name} (${nearest.token.value ?? ""}) is too far from ${token.value ?? ""}`,
      to: null,
    };
  }

  return {
    from: token.name,
    note: `nearest value: ${nearest.token.value ?? ""}`,
    to: nearest.token.name,
  };
};

const toTokenOutcomes = (
  tokens: readonly TokenValue[],
  target: readonly TokenValue[] | null
): readonly TokenOutcome[] =>
  tokens.map((token) => {
    if (target === null || target.length === 0) {
      return {
        from: token.name,
        note: "the project has no tokens, so the name stays as it is",
        to: null,
      };
    }

    return toOutcome(token, target);
  });

export { toTokenOutcomes };

export type { TokenOutcome, TokenValue };
