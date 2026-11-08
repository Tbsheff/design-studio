import type { DirectionRun } from "../direct-edit/index.js";
import {
  readDesignSystemState,
  SOURCE_LOC_ATTR,
  withPagePath,
} from "./deps.js";
import type { CompiledTokenEntry } from "./deps.js";
import type { AccessibilityFrame } from "./frame.js";
import { toAccessibilityFrame } from "./live-frame.js";

interface VisionTargetRequest {
  readonly directionId: string | null;
  readonly frameId: string;
  readonly layer: string | null;
}

interface VisionTarget extends DirectionRun {
  readonly entries: readonly CompiledTokenEntry[];
  readonly frame: AccessibilityFrame;
  readonly selector: string | null;
  readonly url: string;
}

const LOC_PATTERN = /^\S+:\d+:\d+$/u;

const toLayerSelector = (layer: string | null): string | null => {
  if (layer === null) {
    return null;
  }

  if (LOC_PATTERN.test(layer)) {
    return `[${SOURCE_LOC_ATTR}="${layer}"]`;
  }

  return layer;
};

const toOwningRun = async (
  run: DirectionRun,
  frame: AccessibilityFrame,
  request: VisionTargetRequest
): Promise<DirectionRun> => {
  const owner = frame.directionId;

  if (
    request.directionId !== null ||
    owner === null ||
    owner === run.direction.id
  ) {
    return run;
  }

  const loaded = await run.runtime.loadDirection(run.project.id, owner);

  return { ...loaded, runtime: run.runtime };
};

const getVisionTarget = async (
  run: DirectionRun,
  request: VisionTargetRequest
): Promise<VisionTarget> => {
  const first = await toAccessibilityFrame(
    run.runtime.canvas,
    run.project,
    run.direction,
    request.frameId
  );

  const owning = await toOwningRun(run, first, request);
  const page = first.page ?? "";

  const [base, state] = await Promise.all([
    owning.runtime.preview.directionUrl(owning.project, owning.direction),
    readDesignSystemState(owning.project, owning.direction),
  ]);

  return {
    direction: owning.direction,
    entries: state.entries,
    frame: first,
    project: owning.project,
    runtime: owning.runtime,
    selector: toLayerSelector(request.layer),
    url: withPagePath(base, page),
  };
};

export { getVisionTarget };

export type { VisionTarget, VisionTargetRequest };
