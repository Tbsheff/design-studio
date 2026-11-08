import { useRef } from "react";
import type { ClipboardEvent, RefObject } from "react";

import { getSoleUrl, listImageFiles } from "./composer-drafts-model.js";
import type { ImageDraft, ReferenceDraft } from "./composer-drafts-model.js";
import { useComposerDrop } from "./use-composer-drop.js";
import { useImageDrafts } from "./use-image-drafts.js";
import { useReferenceDrafts } from "./use-reference-drafts.js";

interface ComposerAttachments {
  readonly addImages: (picked: File[]) => void;
  readonly dropHandlers: ReturnType<typeof useComposerDrop>["dropHandlers"];
  readonly fileRef: RefObject<HTMLInputElement | null>;
  readonly images: ImageDraft[];
  readonly isDragging: boolean;
  readonly onPromptPaste: (event: ClipboardEvent<HTMLTextAreaElement>) => void;
  readonly references: ReferenceDraft[];
  readonly removeImage: (id: string) => void;
  readonly removeReference: (url: string) => void;
}

const useComposerAttachments = (
  setFormError: (message: string | null) => void,
  onFolder: ((data: DataTransfer) => boolean) | null
): ComposerAttachments => {
  const { addImages, images, removeImage } = useImageDrafts(setFormError);

  const { addReference, references, removeReference } =
    useReferenceDrafts(setFormError);

  const { dropHandlers, isDragging } = useComposerDrop(
    addImages,
    addReference,
    onFolder
  );

  const fileRef = useRef<HTMLInputElement>(null);

  const onPromptPaste = (event: ClipboardEvent<HTMLTextAreaElement>): void => {
    const files = listImageFiles(event.clipboardData.files);

    if (files.length > 0) {
      event.preventDefault();
      addImages(files);

      return;
    }

    const reference = getSoleUrl(event.clipboardData.getData("text/plain"));

    if (reference) {
      event.preventDefault();
      addReference(reference);
    }
  };

  return {
    addImages,
    dropHandlers,
    fileRef,
    images,
    isDragging,
    onPromptPaste,
    references,
    removeImage,
    removeReference,
  };
};

export { useComposerAttachments };

export type { ComposerAttachments };
