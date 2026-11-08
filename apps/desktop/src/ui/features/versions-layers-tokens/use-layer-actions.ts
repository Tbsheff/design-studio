import type { StructureEditRequest } from "@design-studio/contracts";
import { useCallback } from "react";
import type { RefObject } from "react";

import type { LayerEditsOptions } from "./layer-edits-types.js";
import { useLayerApply } from "./use-layer-apply.js";
import type { LayerCore } from "./use-layer-core.js";
import { useNodeEdits } from "./use-node-edits.js";
import type { NodeEdits } from "./use-node-edits.js";
import { useNodeTask } from "./use-node-task.js";
import { useStructureApply } from "./use-structure-apply.js";

interface LayerActions {
  readonly applyStructure: (request: StructureEditRequest) => Promise<void>;
  readonly nodeEdits: NodeEdits;
}

const useLayerActions = (
  options: LayerEditsOptions,
  liveRef: RefObject<LayerEditsOptions>,
  core: LayerCore
): LayerActions => {
  const { context, overrides, treeState } = core;
  const applyStructure = useStructureApply(context);
  const apply = useLayerApply(context, overrides.clearHidden);
  const getOptions = useCallback(() => liveRef.current, [liveRef]);

  const forNode = useNodeTask({
    getOptions,
    isTreeFresh: treeState.isTreeFresh,
    selectedNode: options.frames.selectedNode,
    selection: options.selection,
  });

  const nodeEdits = useNodeEdits({
    apply,
    context,
    forNode,
    markHidden: overrides.markHidden,
    markName: overrides.markName,
  });

  return { applyStructure, nodeEdits };
};

export { useLayerActions };
