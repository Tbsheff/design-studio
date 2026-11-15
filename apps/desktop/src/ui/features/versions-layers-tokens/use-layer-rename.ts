import type { LayerNode } from "@design-studio/contracts";
import { useCallback, useState } from "react";
import type { RefObject } from "react";

import { editableName } from "./layers-tree.js";
import { useLatest } from "./use-latest.js";
import { useRenameMany } from "./use-rename-many.js";
import type { RenameMany, RenameManyApi } from "./use-rename-many.js";

interface LayerRenameInput {
  readonly keys: Map<number, string>;
  readonly listRef: RefObject<HTMLDivElement | null>;
  readonly nodes: LayerNode[];
  readonly onRename: ((id: number, name: string | null) => void) | null;
  readonly onRenameMany: RenameMany | null;
  readonly onSelect: (id: number, isAdditive: boolean) => void;
  readonly rows: LayerNode[];
  readonly selectedNodes: ReadonlySet<number>;
}

interface LayerRenameApi {
  readonly editingKey: string | null;
  readonly finishRename: (
    node: LayerNode,
    value: string | null,
    step?: 1 | -1
  ) => void;
  readonly many: RenameManyApi;
  readonly setEditing: (id: number | null) => void;
  readonly startRename: (id: number) => void;
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
  const { keys, listRef, nodes, onRename, onSelect, rows } = input;
  const { onRenameMany, selectedNodes } = input;
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const many = useRenameMany({ nodes, onRenameMany, selectedNodes });
  const { canOpen, open: openMany } = many;

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

  const startRename = useCallback(
    (id: number): void => {
      if (canOpen && selectedNodes.has(id)) {
        openMany();
      } else {
        setEditing(id);
      }
    },
    [canOpen, openMany, selectedNodes, setEditing]
  );

  return { editingKey, finishRename, many, setEditing, startRename };
};

export { useLayerRename };

export type { LayerRenameApi };
