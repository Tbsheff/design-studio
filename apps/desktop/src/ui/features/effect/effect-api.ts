import { EFFECT_STACK_MAX, call, effectRoutes } from "./deps.js";
import type {
  SelectionContext,
  SourceLoc,
  WireOutput,
  createEffect,
  setEffect,
} from "./deps.js";
import type {
  EffectIds,
  EffectInfo,
  EffectItem,
  EffectStyle,
} from "./effect-types.js";

const NO_SOURCE = "This layer has no source location.";

const STYLE_PAGE = 200;

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

const readStyles = async (ids: EffectIds): Promise<readonly EffectStyle[]> => {
  const page = await call(effectRoutes.listEffect, {
    cursor: null,
    directionId: ids.directionId,
    limit: STYLE_PAGE,
    projectId: ids.projectId,
  });

  return page.items;
};

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

const writeStyle = (
  ids: EffectIds,
  target: SelectionContext,
  name: string | null
): Promise<WireOutput<typeof setEffect>> => {
  const { selector, source, tag } = target;

  if (source === null) {
    return Promise.reject(new Error(NO_SOURCE));
  }

  return call(effectRoutes.setEffect, {
    directionId: ids.directionId,
    projectId: ids.projectId,
    styleName: name,
    target: { selector, source, tag },
  });
};

const saveStyle = (
  ids: EffectIds,
  styleName: string,
  stack: readonly EffectItem[]
): Promise<WireOutput<typeof createEffect>> =>
  call(effectRoutes.createEffect, {
    directionId: ids.directionId,
    effects: stack,
    name: styleName,
    projectId: ids.projectId,
  });

export { readEffects, readStyles, saveStyle, writeEffects, writeStyle };
