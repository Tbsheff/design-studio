import type { Effect } from "effect";

import type { KnownFailure } from "../../platform/attempt/index.js";
import { runDirectionRead, runDirectionWrite } from "./deps.js";
import type { DirectionIds } from "./deps.js";
import type { LayerStyleGroup } from "./engine/index.js";
import { applyLayerStyleBatch } from "./layer-style-apply.js";
import type { LayerStyleChange } from "./layer-style-apply.js";
import { toLayerStyleFailure } from "./layer-style-failure.js";
import { inspectLayerStyle } from "./layer-style-get.js";
import type { LayerStyleInfo } from "./layer-style-get.js";

interface GetLayerStyleCommand {
  readonly directionId: string | null;
  readonly groups: readonly LayerStyleGroup[];
  readonly layerId: string;
  readonly projectId: string;
}

interface ApplyLayerStyleCommand {
  readonly directionId: string | null;
  readonly groups: readonly LayerStyleGroup[];
  readonly projectId: string;
  readonly sourceLayerId: string;
  readonly targetLayerIds: readonly string[];
}

const MAIN_DIRECTION_ID = "main";

const toIds = (command: {
  readonly directionId: string | null;
  readonly projectId: string;
}): DirectionIds => {
  if (command.directionId === null) {
    return { directionId: MAIN_DIRECTION_ID, projectId: command.projectId };
  }

  return { directionId: command.directionId, projectId: command.projectId };
};

const runLayerStyleGet = (
  command: GetLayerStyleCommand
): Effect.Effect<LayerStyleInfo, KnownFailure> =>
  runDirectionRead(
    toIds(command),
    (run) =>
      inspectLayerStyle(run, {
        groups: command.groups,
        layerId: command.layerId,
      }),
    toLayerStyleFailure
  );

const runLayerStyleApply = (
  command: ApplyLayerStyleCommand
): Effect.Effect<LayerStyleChange, KnownFailure> =>
  runDirectionWrite(
    toIds(command),
    (run) =>
      applyLayerStyleBatch(run, {
        groups: command.groups,
        sourceLayerId: command.sourceLayerId,
        targetLayerIds: command.targetLayerIds,
      }),
    toLayerStyleFailure
  );

export { runLayerStyleApply, runLayerStyleGet };

export type { ApplyLayerStyleCommand, GetLayerStyleCommand };
