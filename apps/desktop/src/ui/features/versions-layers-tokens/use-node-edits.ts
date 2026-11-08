import type { ReorderMove, SelectionContext } from "@design-studio/contracts";
import { useCallback } from "react";

import type { EditContext } from "./layer-edit-context.js";
import type { LayerApply } from "./use-layer-apply.js";

interface NodeEditsInput {
  readonly apply: LayerApply;
  readonly context: EditContext;
  readonly forNode: (
    id: number,
    run: (target: SelectionContext) => void
  ) => void;
  readonly markHidden: (id: number, isHidden: boolean) => void;
  readonly markName: (id: number, name: string) => void;
}

interface NodeEdits {
  readonly moveNode: (id: number, move: ReorderMove) => void;
  readonly moveSelected: (move: ReorderMove) => void;
  readonly renameNode: (id: number, name: string | null) => void;
  readonly setNodeHidden: (id: number, isHidden: boolean) => void;
}

const useNodeEdits = (input: NodeEditsInput): NodeEdits => {
  const { apply, context, forNode, markHidden, markName } = input;
  const { liveRef } = context;

  const isMoveBlocked = useCallback(
    (): boolean => context.busy.isBusy() || context.reselect.hasPendingMove(),
    [context]
  );

  const moveSelected = useCallback(
    (move: ReorderMove): void => {
      const last = liveRef.current.selection.at(-1);

      if (last && !isMoveBlocked()) {
        apply(last, { move }, null);
      }
    },
    [apply, isMoveBlocked, liveRef]
  );

  const renameNode = useCallback(
    (id: number, name: string | null): void => {
      if (name !== null) {
        markName(id, name);
      }

      forNode(id, (target) => {
        apply(target, { name }, null);
      });
    },
    [apply, forNode, markName]
  );

  const setNodeHidden = useCallback(
    (id: number, isHidden: boolean): void => {
      markHidden(id, isHidden);

      forNode(id, (target) => {
        apply(target, { hidden: isHidden }, id);
      });
    },
    [apply, forNode, markHidden]
  );

  const moveNode = useCallback(
    (id: number, move: ReorderMove): void => {
      if (isMoveBlocked()) {
        return;
      }

      forNode(id, (target) => {
        apply(target, { move }, null);
      });
    },
    [apply, forNode, isMoveBlocked]
  );

  return { moveNode, moveSelected, renameNode, setNodeHidden };
};

export { useNodeEdits };

export type { NodeEdits };
