import type { LayerNode } from "@design-studio/contracts";
import { useCallback } from "react";
import type { RefObject, UIEvent } from "react";

import type { DragHandlers } from "./layer-drag-model.js";
import {
  saveScrollTop,
  toOpenState,
  toRowWindow,
  toSelectedIndex,
} from "./layers-open-state-model.js";
import type { RowWindow } from "./layers-open-state-model.js";
import { useListWindow } from "./use-list-window.js";
import { useRowDrag } from "./use-row-drag.js";
import type { RowDragApi } from "./use-row-drag.js";
import { useScrollIntoView } from "./use-scroll-into-view.js";

interface LayerListStateInput {
  readonly handlers: DragHandlers;
  readonly listRef: RefObject<HTMLDivElement | null>;
  readonly rows: LayerNode[];
  readonly rowsRef: RefObject<HTMLDivElement | null>;
  readonly scope: string;
  readonly selectedNode: number | null;
}

interface LayerListState {
  readonly drag: RowDragApi;
  readonly onScroll: (event: UIEvent<HTMLDivElement>) => void;
  readonly rowWindow: RowWindow;
  readonly selectedIndex: number;
}

const useLayerListState = (input: LayerListStateInput): LayerListState => {
  const { handlers, listRef, rows, rowsRef, scope, selectedNode } = input;
  const openState = toOpenState(scope);

  const onScrollTop = useCallback(
    (top: number): void => {
      saveScrollTop(scope, top);
    },
    [scope]
  );

  const { onScroll, scroll } = useListWindow(listRef, {
    initialTop: openState.scrollTop,
    isReady: rows.length > 0,
    onScrollTop,
  });

  const drag = useRowDrag(rows, rowsRef, handlers);
  const selectedIndex = toSelectedIndex(rows, selectedNode);

  useScrollIntoView(listRef, selectedIndex);

  const rowWindow = toRowWindow(scroll, rows.length);

  return { drag, onScroll, rowWindow, selectedIndex };
};

export { useLayerListState };

export type { LayerListState };
