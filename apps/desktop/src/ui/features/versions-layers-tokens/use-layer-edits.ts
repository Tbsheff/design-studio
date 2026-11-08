import { useMemo } from "react";

import { IS_MAC } from "../commands/index.js";
import {
  NO_SOURCE,
  applyPasteJsx,
  toDropRequest,
  toSelectionTargets,
} from "../inspector/index.js";
import type { LayerEdits, LayerEditsOptions } from "./layer-edits-types.js";
import type { StructureDeps } from "./layer-structure-deps.js";
import { useLatestRef } from "./use-latest-ref.js";
import { useLatest } from "./use-latest.js";
import { useLayerActions } from "./use-layer-actions.js";
import { useLayerBridge } from "./use-layer-bridge.js";
import { useLayerCore } from "./use-layer-core.js";
import { useStructureOps } from "./use-structure-ops.js";

const isMac = IS_MAC;

const STRUCTURE_DEPS: StructureDeps = {
  dropRequest: toDropRequest,
  isMac: IS_MAC,
  noSource: NO_SOURCE,
  pasteJsx: applyPasteJsx,
  selectionTargets: toSelectionTargets,
};

const useLayerEdits = (options: LayerEditsOptions): LayerEdits => {
  const { enabled } = options;
  const liveRef = useLatestRef(options);
  const core = useLayerCore(options, liveRef);
  const { applyStructure, nodeEdits } = useLayerActions(options, liveRef, core);
  const { context, locks, overrides, treeState } = core;

  const ops = useStructureOps({
    applyStructure,
    context,
    deps: STRUCTURE_DEPS,
  });

  const { moveSelected } = nodeEdits;
  const { onBridge } = locks;
  const { resolveReselect, sendReselect } = context.reselect;
  const { setTreeToken } = treeState;
  const latestKey = useLatest(ops.structureKey);

  useLayerBridge({
    isMac,
    liveRef,
    moveSelected,
    onBridge,
    resolveReselect,
    sendReselect,
    setTreeToken,
    structureKey: latestKey,
  });

  const { canPaste, dropNode, structureKey } = ops;
  const { clearNotice, notice, notify } = core;
  const { setNodeLocked } = locks;
  const { displayTree: tree } = overrides;
  const busy = core.isBusy;
  const settled = !busy && treeState.isFresh;

  return useMemo(
    () => ({
      ...nodeEdits,
      applyStructure,
      busy,
      canPaste,
      clearNotice,
      dropNode,
      enabled,
      notice,
      notify,
      setNodeLocked,
      settled,
      structureKey,
      tree,
    }),
    [
      applyStructure,
      busy,
      canPaste,
      clearNotice,
      dropNode,
      enabled,
      nodeEdits,
      notice,
      notify,
      setNodeLocked,
      settled,
      structureKey,
      tree,
    ]
  );
};

export { useLayerEdits };

export type { LayerEdits, LayerFrames } from "./layer-edits-types.js";
