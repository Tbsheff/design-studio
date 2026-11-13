import type { SelectionContext } from "@design-studio/contracts";
import { useCallback, useTransition } from "react";

import { layerStyleRoutes, useAction } from "./deps.js";
import type { DirectEdit } from "./use-direct-edit.js";
import { setEdit } from "./use-layout-keys.js";

interface AutoLayout {
  readonly handleAdd: () => void;
  readonly isPending: boolean;
}

const NO_GAP = null;

const AUTO_LAYOUT = "auto";

const toLayoutLayerId = (selection: SelectionContext | null): string | null => {
  const source = selection?.source ?? null;

  if (source === null) {
    return null;
  }

  return `${source.file}:${source.line}:${source.col}`;
};

const useAutoLayout = (
  edit: DirectEdit,
  selection: SelectionContext | null
): AutoLayout => {
  const [isPending, startWork] = useTransition();
  const { run } = useAction(layerStyleRoutes.setLayerStyle);
  const target = toLayoutLayerId(selection);
  const { scope } = edit;

  const handleAdd = useCallback((): void => {
    if (target === null) {
      setEdit(edit, { display: "flex" });

      return;
    }

    startWork(async () => {
      await edit.drain();
      await run({
        directionId: scope.directionId,
        gap: NO_GAP,
        layerId: target,
        layout: AUTO_LAYOUT,
        projectId: scope.projectId,
      });
    });
  }, [edit, run, scope, target]);

  return { handleAdd, isPending };
};

export { useAutoLayout };

export type { AutoLayout };
