import type { LayerNode } from "@design-studio/contracts";
import { useCallback, useMemo, useSyncExternalStore } from "react";

import {
  applyDefaultCollapse,
  revealNode,
  subscribeOpenState,
  toCollapsedIds,
  toggleCollapsed,
  toOpenState,
} from "./layers-open-state-model.js";
import { layerKeys } from "./layers-tree.js";

interface CollapsedApi {
  readonly collapsed: Set<number>;
  readonly keys: Map<number, string>;
  readonly toggle: (id: number, open: boolean | null) => void;
}

const useLayerCollapse = (
  nodes: LayerNode[],
  selectedNode: number | null,
  scope: string
): CollapsedApi => {
  const keys = useMemo(() => layerKeys(nodes), [nodes]);
  const state = toOpenState(scope);

  applyDefaultCollapse(nodes, keys, state);
  revealNode(nodes, keys, state, selectedNode);

  const collapsedKeys = useSyncExternalStore(
    subscribeOpenState,
    () => toOpenState(scope).collapsed
  );

  const collapsed = useMemo(
    () => toCollapsedIds(nodes, keys, collapsedKeys),
    [nodes, keys, collapsedKeys]
  );

  const toggle = useCallback(
    (id: number, open: boolean | null): void => {
      if (!keys.has(id)) {
        return;
      }

      toggleCollapsed(state, keys.get(id) ?? "", open);
    },
    [keys, state]
  );

  return { collapsed, keys, toggle };
};

export { useLayerCollapse };

export type { CollapsedApi };
