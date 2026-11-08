import { useCallback, useEffect } from "react";
import type { ClipboardEvent, RefObject } from "react";

import { toImageFiles } from "./comment-composer-model.js";

interface ImageDrop {
  onPaste: (event: ClipboardEvent<HTMLTextAreaElement>) => void;
}

const useImageDrop = (
  isEnabled: boolean,
  add: (files: File[]) => void,
  area: RefObject<HTMLTextAreaElement | null>,
  card: RefObject<HTMLElement | null>
): ImageDrop => {
  const onPaste = useCallback(
    (event: ClipboardEvent<HTMLTextAreaElement>): void => {
      const files = toImageFiles(event.clipboardData.files);

      if (!isEnabled || files.length === 0) {
        return;
      }

      event.preventDefault();
      add(files);
    },
    [add, isEnabled]
  );

  useEffect(() => {
    const element = card.current;

    if (!element || !isEnabled) {
      return;
    }

    const onDragOver = (event: DragEvent): void => {
      if (event.dataTransfer?.types.includes("Files")) {
        event.preventDefault();
      }
    };

    const onDrop = (event: DragEvent): void => {
      const files = toImageFiles(event.dataTransfer?.files ?? null);

      if (files.length === 0) {
        return;
      }

      event.preventDefault();
      add(files);
      area.current?.focus();
    };

    element.addEventListener("dragover", onDragOver);
    element.addEventListener("drop", onDrop);

    return (): void => {
      element.removeEventListener("dragover", onDragOver);
      element.removeEventListener("drop", onDrop);
    };
  }, [add, area, card, isEnabled]);

  return { onPaste };
};

export { useImageDrop };

export type { ImageDrop };
