import { useMemo } from "react";
import type { RefObject } from "react";

import type { EditContext } from "./layer-edit-context.js";
import type { LayerEditsOptions } from "./layer-edits-types.js";
import { useEditBusy } from "./use-edit-busy.js";
import { useLayerLocks } from "./use-layer-locks.js";
import type { LayerLocks } from "./use-layer-locks.js";
import { useLayerOverrides } from "./use-layer-overrides.js";
import type { LayerOverridesApi } from "./use-layer-overrides.js";
import { useNotice } from "./use-notice.js";
import { useReselect } from "./use-reselect.js";
import { useTreeState } from "./use-tree-state.js";
import type { TreeState } from "./use-tree-state.js";

interface LayerCore {
  readonly clearNotice: () => void;
  readonly context: EditContext;
  readonly isBusy: boolean;
  readonly locks: LayerLocks;
  readonly notice: string | null;
  readonly notify: (message: string) => void;
  readonly overrides: LayerOverridesApi;
  readonly treeState: TreeState;
}

const useLayerCore = (
  options: LayerEditsOptions,
  liveRef: RefObject<LayerEditsOptions>
): LayerCore => {
  const { directionId, frames, projectId, selection, treeWanted } = options;
  const { clearNotice, notice, notify } = useNotice();
  const busy = useEditBusy();

  const reselect = useReselect({
    frontToken: frames.frontToken,
    liveRef,
    notify,
    selection,
  });

  const context: EditContext = useMemo(
    () => ({ busy, liveRef, notify, reselect }),
    [busy, liveRef, notify, reselect]
  );

  const treeState = useTreeState(frames, treeWanted);
  const overrides = useLayerOverrides(frames.tree);

  const locks = useLayerLocks(
    projectId,
    directionId,
    frames.frontToken,
    frames.post
  );

  const isBusy = busy.isInflight || reselect.isReselecting;

  return {
    clearNotice,
    context,
    isBusy,
    locks,
    notice,
    notify,
    overrides,
    treeState,
  };
};

export { useLayerCore };

export type { LayerCore };
