import { FILL_STOPS_MAX, FILL_STOPS_MIN } from "./deps.js";
import type {
  BlendMode,
  BlendProperty,
  CompiledTokenEntry,
  FillBlend,
  FillSpec,
  FillStop,
  RadialForm,
} from "./deps.js";
import { FillError } from "./errors.js";
import { paintOf } from "./tokens.js";
import type { PaintInput } from "./tokens.js";

interface StopInput extends PaintInput {
  position?: number | undefined;
}

interface FillInput extends PaintInput {
  angle?: number | undefined;
  at?: string | undefined;
  blendMode?: BlendMode | undefined;
  blendProperty?: BlendProperty | undefined;
  form?: RadialForm | undefined;
  stops?: StopInput[] | undefined;
  type: FillSpec["type"];
}

interface FillRequestSpec {
  blend: FillBlend | null;
  fill: FillSpec;
}

interface TokenPool {
  entries: readonly CompiledTokenEntry[];
  themeNames: ReadonlySet<string>;
}

const DEFAULT_ANGLE = 180;

const stopsOf = (pool: TokenPool, input: FillInput): FillStop[] => {
  const stops = input.stops ?? [];

  if (stops.length < FILL_STOPS_MIN || stops.length > FILL_STOPS_MAX) {
    throw new FillError(
      `A gradient needs ${FILL_STOPS_MIN} to ${FILL_STOPS_MAX} stops.`
    );
  }

  return stops.map((stop) => {
    const paint = paintOf(pool.entries, stop, pool.themeNames);

    return {
      color: paint.color,
      position: stop.position ?? null,
      token: paint.token,
    };
  });
};

const fillOf = (pool: TokenPool, input: FillInput): FillSpec => {
  if (input.type === "solid") {
    return {
      paint: paintOf(pool.entries, input, pool.themeNames),
      type: "solid",
    };
  }

  if (input.type === "linear") {
    return {
      angle: input.angle ?? DEFAULT_ANGLE,
      stops: stopsOf(pool, input),
      type: "linear",
    };
  }

  return {
    at: input.at?.trim() || null,
    form: input.form ?? "ellipse",
    stops: stopsOf(pool, input),
    type: "radial",
  };
};

const blendOf = (input: FillInput): FillBlend | null => {
  if (!input.blendMode) {
    return null;
  }

  return {
    mode: input.blendMode,
    property: input.blendProperty ?? "mix-blend-mode",
  };
};

const specOf = (pool: TokenPool, input: FillInput): FillRequestSpec => ({
  blend: blendOf(input),
  fill: fillOf(pool, input),
});

export { specOf };

export type { FillInput, FillRequestSpec, StopInput, TokenPool };
