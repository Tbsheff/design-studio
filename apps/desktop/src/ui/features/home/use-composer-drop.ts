import { useState } from "react";
import type { DragEvent } from "react";

import { getSoleUrl } from "./composer-drafts-model.js";
import type { ReferenceDraft } from "./composer-drafts-model.js";

interface DropHandlers {
  readonly onDragLeave: (event: DragEvent<HTMLFormElement>) => void;
  readonly onDragOver: (event: DragEvent<HTMLFormElement>) => void;
  readonly onDrop: (event: DragEvent<HTMLFormElement>) => void;
}

interface ComposerDrop {
  readonly dropHandlers: DropHandlers;
  readonly isDragging: boolean;
}

const isAcceptedDrag = (event: DragEvent<HTMLFormElement>): boolean =>
  [...event.dataTransfer.types].some(
    (type) => type === "Files" || type === "text/uri-list"
  );

const useComposerDrop = (
  addImages: (picked: File[]) => void,
  addReference: (reference: ReferenceDraft) => void,
  onFolder: ((data: DataTransfer) => boolean) | null
): ComposerDrop => {
  const [isDragging, setIsDragging] = useState(false);

  const onDragOver = (event: DragEvent<HTMLFormElement>): void => {
    if (!isAcceptedDrag(event)) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";

    if (!isDragging) {
      setIsDragging(true);
    }
  };

  const onDrop = (event: DragEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setIsDragging(false);

    if (onFolder?.(event.dataTransfer)) {
      return;
    }

    const files = [...event.dataTransfer.files];

    if (files.length > 0) {
      addImages(files);

      return;
    }

    const reference = getSoleUrl(
      event.dataTransfer.getData("text/uri-list").split("\n")[0] ?? ""
    );

    if (reference) {
      addReference(reference);
    }
  };

  const onDragLeave = (event: DragEvent<HTMLFormElement>): void => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsDragging(false);
    }
  };

  return { dropHandlers: { onDragLeave, onDragOver, onDrop }, isDragging };
};

export { useComposerDrop };

export type { DropHandlers, ComposerDrop };
