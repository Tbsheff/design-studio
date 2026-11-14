import {
  call,
  STACKING_OVERFLOWS,
  STACKING_POSITIONS,
  stackingRoutes,
} from "./deps.js";
import type {
  SelectionContext,
  SourceLoc,
  StackingInfo,
  StackingOverflow,
  StackingPosition,
  StackingSetResult,
} from "./deps.js";
import type { StackingEdit } from "./stacking-model.js";

interface StackingIds {
  readonly directionId: string;
  readonly projectId: string;
}

interface TypedEdit {
  bottom?: string | null;
  left?: string | null;
  overflowX?: StackingOverflow | null;
  overflowY?: StackingOverflow | null;
  position?: StackingPosition | null;
  right?: string | null;
  top?: string | null;
  zIndex?: string | null;
}

const isOverflow = (value: string): value is StackingOverflow =>
  STACKING_OVERFLOWS.some((entry) => entry === value);

const isPosition = (value: string): value is StackingPosition =>
  STACKING_POSITIONS.some((entry) => entry === value);

const toTypedEdit = (edit: StackingEdit): TypedEdit => {
  const { overflowX = "", overflowY = "", position = "", ...plain } = edit;
  const typed: TypedEdit = { ...plain };

  if (edit.overflowX === null) {
    typed.overflowX = null;
  }

  if (edit.overflowY === null) {
    typed.overflowY = null;
  }

  if (edit.position === null) {
    typed.position = null;
  }

  if (overflowX !== null && isOverflow(overflowX)) {
    typed.overflowX = overflowX;
  }

  if (overflowY !== null && isOverflow(overflowY)) {
    typed.overflowY = overflowY;
  }

  if (position !== null && isPosition(position)) {
    typed.position = position;
  }

  return typed;
};

const readStacking = (
  ids: StackingIds,
  source: SourceLoc,
  breakpoint: string
): Promise<StackingInfo> =>
  call(stackingRoutes.getStacking, {
    breakpoint,
    col: source.col,
    directionId: ids.directionId,
    file: source.file,
    line: source.line,
    projectId: ids.projectId,
  });

type StackingTarget = Pick<SelectionContext, "selector" | "source" | "tag">;

const writeStacking = (
  ids: StackingIds,
  target: StackingTarget,
  breakpoint: string,
  edit: StackingEdit
): Promise<StackingSetResult> => {
  const { source: location } = target;

  if (location === null) {
    return Promise.reject(new Error("This layer has no source location."));
  }

  return call(stackingRoutes.setStacking, {
    ...toTypedEdit(edit),
    breakpoint,
    directionId: ids.directionId,
    projectId: ids.projectId,
    target: { selector: target.selector, source: location, tag: target.tag },
  });
};

interface ZTargetEdit {
  readonly edit: StackingEdit;
  readonly target: StackingTarget;
}

interface OtherTarget {
  readonly selector: string;
  readonly source: SourceLoc;
  readonly tag: string;
}

interface OtherLayer {
  readonly position?: StackingPosition | null;
  readonly target: OtherTarget;
  readonly zIndex: string | null;
}

const toOtherLayers = (layer: ZTargetEdit): OtherLayer[] => {
  const { source: location } = layer.target;

  if (location === null) {
    return [];
  }

  const typed = toTypedEdit(layer.edit);
  const zIndex = typed.zIndex ?? null;

  const target: OtherTarget = {
    selector: layer.target.selector,
    source: location,
    tag: layer.target.tag,
  };

  if (!("position" in typed)) {
    return [{ target, zIndex }];
  }

  return [{ position: typed.position ?? null, target, zIndex }];
};

const writeZOrder = (
  ids: StackingIds,
  layers: readonly ZTargetEdit[],
  breakpoint: string
): Promise<StackingSetResult> => {
  const first = layers.at(0) ?? null;
  const location = first?.target.source ?? null;

  if (first === null || location === null) {
    return Promise.reject(new Error("This layer has no source location."));
  }

  return call(stackingRoutes.setStacking, {
    ...toTypedEdit(first.edit),
    breakpoint,
    directionId: ids.directionId,
    others: layers.slice(1).flatMap((layer) => toOtherLayers(layer)),
    projectId: ids.projectId,
    target: {
      selector: first.target.selector,
      source: location,
      tag: first.target.tag,
    },
  });
};

export { readStacking, writeStacking, writeZOrder };

export type { StackingIds, StackingTarget, ZTargetEdit };
