import type { LayerNode } from "@design-studio/contracts";
import { useCallback } from "react";
import type { MouseEvent, PointerEvent } from "react";

import { PRIMARY_BUTTON } from "./layers-constants.js";

interface LayerRowHandlerInput {
  readonly isEditable: boolean;
  readonly node: LayerNode;
  readonly onHover: (id: number | null) => void;
  readonly onMenu: (node: LayerNode, event: MouseEvent<HTMLDivElement>) => void;
  readonly onPress: (id: number, event: PointerEvent<HTMLDivElement>) => void;
  readonly onSelect: (id: number, isAdditive: boolean) => void;
  readonly onStartRename: (id: number) => void;
}

interface LayerRowHandlers {
  readonly handleContextMenu: (event: MouseEvent<HTMLDivElement>) => void;
  readonly handleDoubleClick: () => void;
  readonly handlePointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  readonly handlePointerEnter: () => void;
  readonly handlePointerLeave: () => void;
}

const useLayerRowHandlers = (
  input: LayerRowHandlerInput
): LayerRowHandlers => {
  const { isEditable, node, onHover, onMenu, onPress, onSelect, onStartRename } =
    input;

  const handlePointerEnter = useCallback((): void => {
    onHover(node.id);
  }, [node.id, onHover]);

  const handlePointerLeave = useCallback((): void => {
    onHover(null);
  }, [onHover]);

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>): void => {
      if (event.button !== PRIMARY_BUTTON) {
        return;
      }

      event.preventDefault();
      event.currentTarget.closest<HTMLElement>('[role="tree"]')?.focus();
      onSelect(node.id, event.shiftKey);
      onPress(node.id, event);
    },
    [node.id, onPress, onSelect]
  );

  const handleDoubleClick = useCallback((): void => {
    if (isEditable) {
      onStartRename(node.id);
    }
  }, [isEditable, node.id, onStartRename]);

  const handleContextMenu = useCallback(
    (event: MouseEvent<HTMLDivElement>): void => {
      event.preventDefault();
      onMenu(node, event);
    },
    [node, onMenu]
  );

  return {
    handleContextMenu,
    handleDoubleClick,
    handlePointerDown,
    handlePointerEnter,
    handlePointerLeave,
  };
};

export { useLayerRowHandlers };
