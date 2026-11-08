import type {
  LayerNode,
  ReorderMove,
  StructureKey,
} from "@design-studio/contracts";
import { useCallback } from "react";
import type { KeyboardEvent } from "react";

import { reorderMoveOf } from "../../../shared/reorder.js";
import { structureKeyOf } from "../../../shared/structure-keys.js";
import {
  isEscapeKey,
  isHideKey,
  isLockKey,
  isRenameKey,
} from "./layers-keys-model.js";
import { treeKeyAction } from "./layers-tree.js";

interface LayerKeyEdits {
  readonly onMoveSelected: (move: ReorderMove) => void;
  readonly onStructureKey?: (key: StructureKey) => void;
  readonly onToggleHidden: (id: number, hidden: boolean) => void;
}

interface LayerKeysInput {
  readonly collapsed: ReadonlySet<number>;
  readonly edits: LayerKeyEdits | null;
  readonly isMac: boolean;
  readonly nodes: LayerNode[];
  readonly onEscape: () => void;
  readonly onSelect: (id: number, isAdditive: boolean) => void;
  readonly onStartEdit: (id: number) => void;
  readonly onToggleLocked: ((id: number, locked: boolean) => void) | undefined;
  readonly rows: LayerNode[];
  readonly selectedIndex: number;
  readonly selectedNode: number | null;
  readonly toggle: (id: number, open?: boolean) => void;
}

interface EditKeyInput {
  readonly edits: LayerKeyEdits | null;
  readonly isMac: boolean;
  readonly onStartEdit: (id: number) => void;
  readonly selectedRow: LayerNode | null;
}

const useEditKey = (
  input: EditKeyInput
): ((event: KeyboardEvent<HTMLDivElement>) => boolean) => {
  const { edits, isMac, onStartEdit, selectedRow } = input;

  return useCallback(
    (event: KeyboardEvent<HTMLDivElement>): boolean => {
      if (!edits || !selectedRow) {
        return false;
      }

      const move = reorderMoveOf(event);

      if (move) {
        edits.onMoveSelected(move);

        return true;
      }

      let structure: StructureKey | null = null;

      if (edits.onStructureKey && !event.repeat) {
        structure = structureKeyOf(event, isMac);
      }

      if (structure) {
        edits.onStructureKey?.(structure);

        return true;
      }

      if (isRenameKey(event)) {
        onStartEdit(selectedRow.id);

        return true;
      }

      if (isHideKey(event)) {
        edits.onToggleHidden(selectedRow.id, !selectedRow.hidden);

        return true;
      }

      return false;
    },
    [edits, isMac, onStartEdit, selectedRow]
  );
};

const runTreeKey = (
  event: KeyboardEvent<HTMLDivElement>,
  input: LayerKeysInput
): boolean => {
  const { collapsed, nodes, onSelect, rows, selectedIndex, toggle } = input;
  let selected: number | null = null;

  if (selectedIndex >= 0) {
    selected = input.selectedNode;
  }

  const action = treeKeyAction(event.key, event.shiftKey, {
    collapsed,
    nodes,
    rows,
    selected,
  });

  if (!action) {
    return false;
  }

  event.preventDefault();

  if ("select" in action) {
    onSelect(action.select, false);
  } else {
    toggle(action.toggle, action.open);
  }

  return true;
};

const useLayerKeys = (
  input: LayerKeysInput
): ((event: KeyboardEvent<HTMLDivElement>) => void) => {
  const { edits, isMac, onEscape, onStartEdit, rows, selectedIndex } = input;
  const { onToggleLocked } = input;
  let selectedRow: LayerNode | null = null;

  if (selectedIndex >= 0) {
    selectedRow = rows[selectedIndex] ?? null;
  }

  const runEditKey = useEditKey({ edits, isMac, onStartEdit, selectedRow });

  return useCallback(
    (event: KeyboardEvent<HTMLDivElement>): void => {
      if (isEscapeKey(event)) {
        event.preventDefault();
        event.stopPropagation();
        onEscape();

        return;
      }

      if (onToggleLocked && selectedRow && isLockKey(event)) {
        event.preventDefault();
        onToggleLocked(selectedRow.id, !selectedRow.locked);

        return;
      }

      if (runEditKey(event)) {
        event.preventDefault();

        return;
      }

      runTreeKey(event, input);
    },
    [input, onEscape, onToggleLocked, runEditKey, selectedRow]
  );
};

export { useLayerKeys };

export type { LayerKeyEdits };
