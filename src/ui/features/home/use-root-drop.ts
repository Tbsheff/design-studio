import { type DragEvent, useState } from "react";

import { hasFiles } from "./home-model.js";

function useRootDrop(
  takeDrop: (data: DataTransfer) => boolean,
  setFormError: (message: string | null) => void
) {
  const [windowDrag, setWindowDrag] = useState(false);

  const rootDrop = {
    onDragOver: (event: DragEvent<HTMLDivElement>) => {
      if (!hasFiles(event)) {
        return;
      }

      event.preventDefault();
      setWindowDrag(true);
    },
    onDragLeave: (event: DragEvent<HTMLDivElement>) => {
      if (!event.relatedTarget) {
        setWindowDrag(false);
      }
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

  return { windowDrag, rootDrop };
}

export { useRootDrop };
