import { useState } from "react";
import type { DragEvent } from "react";

import { hasFiles } from "./home-model.js";

interface RootDropHandlers {
  readonly onDragLeave: (event: DragEvent<HTMLDivElement>) => void;
  readonly onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  readonly onDrop: (event: DragEvent<HTMLDivElement>) => void;
}

interface RootDrop {
  readonly rootDrop: RootDropHandlers;
  readonly windowDrag: boolean;
}

const useRootDrop = (
  takeDrop: (data: DataTransfer) => boolean,
  setFormError: (message: string | null) => void
): RootDrop => {
  const [windowDrag, setWindowDrag] = useState(false);

  const rootDrop: RootDropHandlers = {
    onDragLeave: (event: DragEvent<HTMLDivElement>): void => {
      if (!event.relatedTarget) {
        setWindowDrag(false);
      }
    },
    onDragOver: (event: DragEvent<HTMLDivElement>): void => {
      if (!hasFiles(event)) {
        return;
      }

      event.preventDefault();
      setWindowDrag(true);
    },
    onDrop: (event: DragEvent<HTMLDivElement>): void => {
      setWindowDrag(false);

      if (event.defaultPrevented || !hasFiles(event)) {
        return;
      }

      event.preventDefault();

      if (!takeDrop(event.dataTransfer)) {
        setFormError("Drop images or a folder on the prompt.");
      }
    },
  };

  return { rootDrop, windowDrag };
};

export { useRootDrop };

export type { RootDropHandlers, RootDrop };
