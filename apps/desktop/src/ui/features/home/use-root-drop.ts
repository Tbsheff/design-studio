import { useState } from "react";
import type { RefObject } from "react";

import { hasFiles } from "./home-model.js";
import { useDropTarget } from "./use-drop-target.js";

interface RootDrop {
  readonly isWindowDragged: boolean;
}

const useRootDrop = (
  homeRef: RefObject<HTMLElement | null>,
  takeDrop: (data: DataTransfer) => boolean,
  setFormError: (message: string | null) => void
): RootDrop => {
  const [isWindowDragged, setIsWindowDragged] = useState(false);

  const onDragLeave = (event: DragEvent): void => {
    if (!event.relatedTarget) {
      setIsWindowDragged(false);
    }
  };

  const onDragOver = (event: DragEvent): void => {
    if (!hasFiles(event)) {
      return;
    }

    event.preventDefault();
    setIsWindowDragged(true);
  };

  const onDrop = (event: DragEvent): void => {
    setIsWindowDragged(false);

    if (event.defaultPrevented || !hasFiles(event) || !event.dataTransfer) {
      return;
    }

    event.preventDefault();

    if (!takeDrop(event.dataTransfer)) {
      setFormError("Drop images or a folder on the prompt.");
    }
  };

  useDropTarget(homeRef, { onDragLeave, onDragOver, onDrop });

  return { isWindowDragged };
};

export { useRootDrop };

export type { RootDrop };
