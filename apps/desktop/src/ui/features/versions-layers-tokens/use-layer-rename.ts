import type { LayerNode } from "@design-studio/contracts";
import { useCallback, useState } from "react";
import type { RefObject } from "react";

import { editableName } from "./layers-tree.js";
import { useLatest } from "./use-latest.js";

interface LayerRenameInput {
  readonly keys: Map<number, string>;
  readonly listRef: RefObject<HTMLDivElement | null>;
  readonly onRename: ((id: number, name: string | null) => void) | null;
  readonly onSelect: (id: number, isAdditive: boolean) => void;
  readonly rows: LayerNode[];
}

interface LayerRenameApi {
  readonly editingKey: string | null;
  readonly finishRename: (
    node: LayerNode,
    value: string | null,
    step?: 1 | -1
  ) => void;
  readonly setEditing: (id: number | null) => void;
}

const toNextRow = (
  rows: LayerNode[],
  node: LayerNode,
  step: 1 | -1 | undefined
): LayerNode | null => {
  const index = rows.findIndex((row) => row.id === node.id);

  if (step && index !== -1) {
    return rows[index + step] ?? null;
  }

  return null;
};

const toRenamedValue = (value: string): string | null => {
  if (value === "") {
    return null;
  }

  return value;
};

const useLayerRename = (input: LayerRenameInput): LayerRenameApi => {
  const { keys, listRef, onRename, onSelect, rows } = input;
  const [editingKey, setEditingKey] = useState<string | null>(null);

  const setEditing = useCallback(
    (id: number | null): void => {
      if (id === null) {
        setEditingKey(null);
      } else {
        setEditingKey(keys.get(id) ?? null);
      }
    },
    [keys]
  );

  const finishRename = useLatest(
    (node: LayerNode, value: string | null, step?: 1 | -1): void => {
      const next = toNextRow(rows, node, step);

      if (next) {
        setEditing(next.id);
        onSelect(next.id, false);
      } else {
        setEditing(null);
        listRef.current?.focus();
      }

      if (value === null || !onRename || value === editableName(node.name)) {
        return;
      }

      onRename(node.id, toRenamedValue(value));
    }
  );

  return { editingKey, finishRename, setEditing };
};

export { useLayerRename };

export type { LayerRenameApi };
