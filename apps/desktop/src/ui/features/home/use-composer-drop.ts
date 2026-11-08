import { useState } from "react";
import type { RefObject } from "react";

import { toDroppedFiles } from "../../domain/reference-files.js";
import { getSoleUrl } from "./composer-drafts-model.js";
import type { ReferenceDraft } from "./composer-drafts-model.js";
import { useDropTarget } from "./use-drop-target.js";

interface ComposerDrop {
  readonly isDragging: boolean;
}

const isAcceptedDrag = (event: DragEvent): boolean =>
  [...(event.dataTransfer?.types ?? [])].some(
    (type) => type === "Files" || type === "text/uri-list"
  );

interface DropSinks {
  readonly addContextFiles: (picked: File[]) => void;
  readonly addImages: (picked: File[]) => void;
  readonly addReference: (reference: ReferenceDraft) => void;
}

const useComposerDrop = (
  formRef: RefObject<HTMLElement | null>,
  sinks: DropSinks,
  onFolder: ((data: DataTransfer) => boolean) | null
): ComposerDrop => {
  const { addContextFiles, addImages, addReference } = sinks;
  const [isDragging, setIsDragging] = useState(false);

  const onDragOver = (event: DragEvent): void => {
    if (!isAcceptedDrag(event) || !event.dataTransfer) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setIsDragging(true);
  };

  const onDrop = (event: DragEvent): void => {
    event.preventDefault();
    setIsDragging(false);

    const data = event.dataTransfer;

    if (!data || onFolder?.(data)) {
      return;
    }

    const files = [...data.files];

    if (files.length > 0) {
      const dropped = toDroppedFiles(files);
      addImages([...dropped.images, ...dropped.others]);
      addContextFiles(dropped.references);

      return;
    }

    const reference = getSoleUrl(
      data.getData("text/uri-list").split("\n")[0] ?? ""
    );

    if (reference) {
      addReference(reference);
    }
  };

  const onDragLeave = (event: DragEvent): void => {
    const next = event.relatedTarget;

    if (!(next instanceof Node && formRef.current?.contains(next))) {
      setIsDragging(false);
    }
  };

  useDropTarget(formRef, { onDragLeave, onDragOver, onDrop });

  return { isDragging };
};

export { useComposerDrop };

export type { ComposerDrop };
