import type { LayerNode } from "@design-studio/contracts";
import type { MouseEvent, PointerEvent } from "react";

import type { LayerRowCallbacks } from "./layer-row-callbacks-model.js";
import { useLatest } from "./use-latest.js";

interface LayerRowCallbacksInput {
  readonly onHover: (id: number | null) => void;
  readonly onMenu: (node: LayerNode, event: MouseEvent<HTMLDivElement>) => void;
  readonly onPress: (id: number, event: PointerEvent<HTMLDivElement>) => void;
  readonly onRenameDone: LayerRowCallbacks["handleRenameDone"];
  readonly onSelect: (id: number, isAdditive: boolean) => void;
  readonly onSetEditing: (id: number | null) => void;
  readonly onToggle: (id: number, open?: boolean) => void;
  readonly onToggleHidden: ((id: number, hidden: boolean) => void) | null;
  readonly onToggleLocked: ((id: number, locked: boolean) => void) | undefined;
}

const useLayerRowCallbacks = (
  input: LayerRowCallbacksInput
): LayerRowCallbacks => {
  const { onToggleHidden, onToggleLocked } = input;
  const handleHover = useLatest(input.onHover);
  const handleMenu = useLatest(input.onMenu);
  const handlePress = useLatest(input.onPress);
  const handleSelect = useLatest(input.onSelect);
  const handleStartRename = useLatest(input.onSetEditing);
  const handleToggle = useLatest(input.onToggle);

  const toggleHidden = useLatest((node: LayerNode): void => {
    onToggleHidden?.(node.id, !node.hidden);
  });

  const toggleLocked = useLatest((node: LayerNode): void => {
    onToggleLocked?.(node.id, !node.locked);
  });

  let handleToggleLocked: LayerRowCallbacks["handleToggleLocked"] = null;

  if (onToggleLocked) {
    handleToggleLocked = toggleLocked;
  }

  const handleRenameDone = input.onRenameDone;
  const handleToggleHidden = toggleHidden;

  return {
    handleHover,
    handleMenu,
    handlePress,
    handleRenameDone,
    handleSelect,
    handleStartRename,
    handleToggle,
    handleToggleHidden,
    handleToggleLocked,
  };
};

export { useLayerRowCallbacks };
