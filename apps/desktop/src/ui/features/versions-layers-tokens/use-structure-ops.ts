import type {
  StructureEditRequest,
  StructureKey,
} from "@design-studio/contracts";
import { useCallback } from "react";

import type { EditContext } from "./layer-edit-context.js";
import type { StructureDeps } from "./layer-structure-deps.js";
import type { LayerDropTarget } from "./layers-drop.js";
import { useCutPaste } from "./use-cut-paste.js";

interface StructureOpsInput {
  readonly applyStructure: (request: StructureEditRequest) => Promise<void>;
  readonly context: EditContext;
  readonly deps: StructureDeps;
}

interface StructureOps {
  readonly canPaste: boolean;
  readonly dropNode: (id: number, drop: LayerDropTarget["drop"]) => void;
  readonly structureKey: (key: StructureKey) => void;
}

const useStructureOps = (input: StructureOpsInput): StructureOps => {
  const { applyStructure, context, deps } = input;
  const { liveRef, notify } = context;
  const cutPaste = useCutPaste(input);

  const { canPaste, copySelection, cutSelection, pasteInto, pasteReplace } =
    cutPaste;

  const structureKey = useCallback(
    (key: StructureKey): void => {
      if (key === "cut") {
        cutSelection();

        return;
      }

      if (key === "copy") {
        copySelection();

        return;
      }

      if (key === "paste") {
        pasteInto();

        return;
      }

      if (key === "paste-replace") {
        pasteReplace();

        return;
      }

      const targets = deps.selectionTargets(liveRef.current.selection);

      if (targets) {
        applyStructure({ op: key, targets });
      } else {
        notify(deps.noSource);
      }
    },
    [
      applyStructure,
      copySelection,
      cutSelection,
      deps,
      liveRef,
      notify,
      pasteInto,
      pasteReplace,
    ]
  );

  const dropNode = useCallback(
    (id: number, drop: LayerDropTarget["drop"]): void => {
      const { current } = liveRef;
      const nodes = current.frames.tree?.nodes ?? [];
      const request = deps.dropRequest(nodes, id, drop, current.selection);

      if (request) {
        applyStructure(request);
      } else {
        notify(deps.noSource);
      }
    },
    [applyStructure, deps, liveRef, notify]
  );

  return { canPaste, dropNode, structureKey };
};

export { useStructureOps };

export type { StructureOps };
