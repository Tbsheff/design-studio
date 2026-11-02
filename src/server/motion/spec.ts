import { CUBIC_BEZIER, EASING_PRESETS } from "./deps.js";
import type {
  EntrancePreset,
  MotionKind,
  MotionSpec,
  MotionTransition,
} from "./deps.js";
import { MotionError } from "./site.js";

interface MotionInput {
  delayMs?: number | undefined;
  durationMs?: number | undefined;
  easing?: string | undefined;
  end?: Record<string, string> | undefined;
  kind: MotionKind;
  preset?: EntrancePreset | undefined;
  properties?: string[] | undefined;
  staggerMs?: number | undefined;
  state?: MotionTransition["state"] | undefined;
}

const TRANSITION_MS = 200;
const ENTRANCE_MS = 400;
const DEFAULT_PROPS = ["opacity", "transform"];

const BEZIER_POINTS = 4;

const isCubicBezier = (easing: string): boolean => {
  if (!CUBIC_BEZIER.test(easing)) {
    return false;
  }

  const inner = easing.slice(easing.indexOf("(") + 1, -1).split(",");

  return (
    inner.length === BEZIER_POINTS &&
    inner.every((part) => part.trim() !== "" && Number.isFinite(Number(part)))
  );
};

const easingOf = (raw: string | undefined): string => {
  const easing = (raw ?? "ease-out").trim();

  if ((EASING_PRESETS as readonly string[]).includes(easing)) {
    return easing;
  }

  if (isCubicBezier(easing)) {
    return easing.replaceAll(" ", "");
  }

  throw new MotionError(
    `easing must be ${EASING_PRESETS.join(", ")} or cubic-bezier(x1,y1,x2,y2).`
  );
};

const propertiesOf = (input: MotionInput): string[] => {
  if (input.properties && input.properties.length > 0) {
    return input.properties;
  }

  const fromEnd = Object.keys(input.end ?? {});

  if (fromEnd.length > 0) {
    return fromEnd;
  }

  return DEFAULT_PROPS;
};

const transitionOf = (input: MotionInput): MotionSpec => {
  if (Object.keys(input.end ?? {}).length > 0 && !input.state) {
    throw new MotionError("end values need a state: hover, focus or active.");
  }

  return {
    delayMs: input.delayMs ?? 0,
    durationMs: input.durationMs ?? TRANSITION_MS,
    easing: easingOf(input.easing),
    end: input.end ?? {},
    kind: "transition",
    properties: propertiesOf(input),
    state: input.state ?? null,
  };
};

const specOf = (input: MotionInput): MotionSpec => {
  if (input.kind === "transition") {
    return transitionOf(input);
  }

  if (input.kind === "entrance") {
    return {
      delayMs: input.delayMs ?? 0,
      durationMs: input.durationMs ?? ENTRANCE_MS,
      kind: "entrance",
      preset: input.preset ?? "fade",
      staggerMs: input.staggerMs ?? 0,
    };
  }

  return { kind: "none" };
};

export { specOf };

export type { MotionInput };
