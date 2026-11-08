import type { LayerNode } from "@design-studio/contracts";
import { useCallback, useState } from "react";
import type { MouseEvent } from "react";

interface RowMenuApi {
  readonly at: DOMPoint | null;
  readonly close: () => void;
  readonly open: (node: LayerNode, event: MouseEvent<HTMLDivElement>) => void;
}

const useRowMenu = (
  hasMenu: boolean,
  selectedNode: number | null,
  onSelect: (id: number, isAdditive: boolean) => void
): RowMenuApi => {
  const [at, setAt] = useState<DOMPoint | null>(null);

  const open = useCallback(
    (node: LayerNode, event: MouseEvent<HTMLDivElement>): void => {
      if (!hasMenu) {
        return;
      }

      if (node.id !== selectedNode) {
        onSelect(node.id, false);
      }

      setAt(new DOMPoint(event.clientX, event.clientY));
    },
    [hasMenu, onSelect, selectedNode]
  );

  const close = useCallback((): void => {
    setAt(null);
  }, []);

  return { at, close, open };
};

export { useRowMenu };

export type { RowMenuApi };
