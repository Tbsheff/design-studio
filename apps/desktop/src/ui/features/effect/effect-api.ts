import { EFFECT_STACK_MAX, call, effectRoutes } from "./deps.js";
import type {
  SelectionContext,
  SourceLoc,
  WireOutput,
  setEffect,
} from "./deps.js";
import type { EffectIds, EffectInfo, EffectItem } from "./effect-types.js";

const NO_SOURCE = "This layer has no source location.";

interface EffectWrite {
  readonly stack: readonly EffectItem[];
  readonly variant: string;
}

const readEffects = (
  ids: EffectIds,
  source: SourceLoc,
  variant: string
): Promise<EffectInfo> =>
  call(effectRoutes.getEffect, {
    col: source.col,
    directionId: ids.directionId,
    file: source.file,
    limit: EFFECT_STACK_MAX,
    line: source.line,
    projectId: ids.projectId,
    variant,
  });

const writeEffects = (
  ids: EffectIds,
  target: SelectionContext,
  write: EffectWrite
): Promise<WireOutput<typeof setEffect>> => {
  const { selector, source, tag } = target;

  if (source === null) {
    return Promise.reject(new Error(NO_SOURCE));
  }

  return call(effectRoutes.setEffect, {
    directionId: ids.directionId,
    effects: write.stack,
    projectId: ids.projectId,
    target: { selector, source, tag },
    variant: write.variant,
  });
};

export { readEffects, writeEffects };
