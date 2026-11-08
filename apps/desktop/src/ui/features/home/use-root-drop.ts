import { useState } from "react";
import type { DragEvent } from "react";

import { hasFiles } from "./home-model.js";

function useRootDrop(
  takeDrop: (data: DataTransfer) => boolean,
  setFormError: (message: string | null) => void
) {
  const [windowDrag, setWindowDrag] = useState(false);

  const rootDrop = {
    onDragLeave: (event: DragEvent<HTMLDivElement>) => {
      if (!event.relatedTarget) {
        setWindowDrag(false);
      }
    },
    onDragOver: (event: DragEvent<HTMLDivElement>) => {
      if (!hasFiles(event)) {
        return;
      }

      event.preventDefault();
      setWindowDrag(true);
    },
    onDrop: (event: DragEvent<HTMLDivElement>) => {
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
}

export { useRootDrop };
