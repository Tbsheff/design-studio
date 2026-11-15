import { routes } from "@design-studio/actions/layer/routes";
import type { ReorderMove, SelectionContext } from "@design-studio/contracts";
import { useCallback } from "react";

import { errorText } from "../../api.js";
import { call } from "../../platform/http.js";
import { COPY } from "./copy.js";
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
  readonly renameNodes: (ids: number[], names: (string | null)[]) => void;
  readonly setNodeHidden: (id: number, isHidden: boolean) => void;
}

interface RenameLayer {
  readonly name: string | null;
  readonly selector: string;
}

const toRenameLayers = (
  context: EditContext,
  ids: readonly number[],
  names: readonly (string | null)[]
): RenameLayer[] => {
  const nodes = context.liveRef.current.frames.tree?.nodes ?? [];
  const byId = new Map(nodes.map((node) => [node.id, node]));

  return ids.flatMap((id, index) => {
    const loc = byId.get(id)?.loc ?? "";

    if (loc === "") {
      return [];
    }

    return [{ name: names[index] ?? null, selector: loc }];
  });
};

const runRenameMany = async (
  context: EditContext,
  ids: readonly number[],
  names: readonly (string | null)[]
): Promise<void> => {
  const { busy, liveRef, notify } = context;
  const { current } = liveRef;
  const { directionId } = current;

  if (!current.enabled || !directionId || busy.isBusy()) {
    return;
  }

  const layers = toRenameLayers(context, ids, names);
  busy.claimBusy();

  try {
    const result = await call(routes.renameLayer, {
      directionId,
      layers,
      path: "",
      projectId: current.projectId,
    });

    const missed = ids.length - result.renamed;

    if (missed > 0) {
      notify(`${missed}${COPY.renameManyNoSource}`);
    }
  } catch (error) {
    notify(errorText(error));
  } finally {
    busy.releaseBusy();
  }
};

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

  const renameNodes = useCallback(
    (ids: number[], names: (string | null)[]): void => {
      for (const [index, id] of ids.entries()) {
        const name = names[index] ?? null;

        if (name !== null) {
          markName(id, name);
        }
      }

      void runRenameMany(context, ids, names);
    },
    [context, markName]
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

  return { moveNode, moveSelected, renameNode, renameNodes, setNodeHidden };
};

export { useNodeEdits };

export type { NodeEdits };
