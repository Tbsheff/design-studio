import type { QueuedMessage } from "@design-studio/contracts";
import { useCallback } from "react";
import type { DragEvent, KeyboardEvent } from "react";

import { moveQueued, toArrowStep } from "./queued-model.js";

interface QueuedMovesOptions {
  index: number;
  items: QueuedMessage[];
  dragFrom: number | null;
  isEditing: boolean;
  onItems: (items: QueuedMessage[]) => void;
  onDragFrom: (from: number | null) => void;
}

interface QueuedMoves {
  onKeyDown: (event: KeyboardEvent<HTMLLIElement>) => void;
  onDragStart: (event: DragEvent) => void;
  onDragOver: (event: DragEvent) => void;
  onDrop: (event: DragEvent) => void;
}

const useQueuedMoves = (options: QueuedMovesOptions): QueuedMoves => {
  const { index, items, dragFrom, isEditing, onItems, onDragFrom } = options;

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLLIElement>): void => {
      const step = toArrowStep(event.key);

      if (isEditing || !event.altKey || !step) {
        return;
      }

      event.preventDefault();
      onItems(moveQueued(items, index, index + step));
    },
    [isEditing, index, items, onItems]
  );

  const onDragStart = useCallback(
    (event: DragEvent) => {
      event.dataTransfer.effectAllowed = "move";
      onDragFrom(index);
    },
    [index, onDragFrom]
  );

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();

      if (dragFrom !== null) {
        onItems(moveQueued(items, dragFrom, index));
      }

      onDragFrom(null);
    },
    [dragFrom, index, items, onItems, onDragFrom]
  );

  return { onDragOver, onDragStart, onDrop, onKeyDown };
};

export { useQueuedMoves };
