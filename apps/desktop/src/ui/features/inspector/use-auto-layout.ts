import type { SelectionContext } from "@design-studio/contracts";
import { useCallback, useState, useTransition } from "react";

import { toSkipNote, toSkipTip } from "./auto-layout-model.js";
import { layerStyleRoutes, useAction } from "./deps.js";
import type { DirectEdit } from "./use-direct-edit.js";
import { setEdit } from "./use-layout-keys.js";

interface SkipNote {
  readonly text: string;
  readonly tip: string;
}

interface AutoLayout {
  readonly handleAdd: () => void;
  readonly isPending: boolean;
  readonly skipNote: SkipNote | null;
}

interface SkipState {
  readonly note: SkipNote;
  readonly target: string;
}

interface SkippedLayer {
  readonly reason: string;
}

const NO_GAP = null;

const AUTO_LAYOUT = "auto";

const AUTO_PADDING = "auto";

const toLayoutLayerId = (selection: SelectionContext | null): string | null => {
  const source = selection?.source ?? null;

  if (source === null) {
    return null;
  }

  return `${source.file}:${source.line}:${source.col}`;
};

const toSkipState = (
  target: string,
  skipped: readonly SkippedLayer[]
): SkipState | null => {
  if (skipped.length === 0) {
    return null;
  }

  return {
    note: {
      text: toSkipNote(skipped.length),
      tip: toSkipTip(skipped.map((layer) => layer.reason)),
    },
    target,
  };
};

const toVisibleNote = (
  state: SkipState | null,
  target: string | null
): SkipNote | null => {
  if (state === null || state.target !== target) {
    return null;
  }

  return state.note;
};

const useAutoLayout = (
  edit: DirectEdit,
  selection: SelectionContext | null
): AutoLayout => {
  const [isPending, startWork] = useTransition();
  const [skip, setSkip] = useState<SkipState | null>(null);
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

      const result = await run({
        directionId: scope.directionId,
        gap: NO_GAP,
        layerId: target,
        layout: AUTO_LAYOUT,
        padding: AUTO_PADDING,
        projectId: scope.projectId,
      });

      setSkip(toSkipState(target, result?.skipped ?? []));
    });
  }, [edit, run, scope, target]);

  return { handleAdd, isPending, skipNote: toVisibleNote(skip, target) };
};

export { useAutoLayout };

export type { AutoLayout, SkipNote };
