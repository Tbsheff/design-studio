import { useRef } from "react";
import type { ClipboardEvent, RefObject } from "react";

import { getSoleUrl, listImageFiles } from "./composer-drafts-model.js";
import type { ImageDraft, ReferenceDraft } from "./composer-drafts-model.js";
import type { ContextDraft } from "./context-drafts-model.js";
import { useComposerDrop } from "./use-composer-drop.js";
import { useContextDrafts } from "./use-context-drafts.js";
import { useImageDrafts } from "./use-image-drafts.js";
import { useReferenceDrafts } from "./use-reference-drafts.js";

interface ComposerAttachments {
  readonly addContextFiles: (picked: File[]) => void;
  readonly addContextFolder: (folderPath: string) => void;
  readonly addImages: (picked: File[]) => void;
  readonly contextFileRef: RefObject<HTMLInputElement | null>;
  readonly contexts: ContextDraft[];
  readonly fileRef: RefObject<HTMLInputElement | null>;
  readonly images: ImageDraft[];
  readonly isDragging: boolean;
  readonly pickContextFolder: () => Promise<void>;
  readonly onPromptPaste: (event: ClipboardEvent<HTMLTextAreaElement>) => void;
  readonly references: ReferenceDraft[];
  readonly removeContext: (id: string) => void;
  readonly removeImage: (id: string) => void;
  readonly removeReference: (url: string) => void;
}

const useComposerAttachments = (
  formRef: RefObject<HTMLElement | null>,
  setFormError: (message: string | null) => void,
  onFolder: ((data: DataTransfer) => boolean) | null
): ComposerAttachments => {
  const { addImages, images, removeImage } = useImageDrafts(setFormError);

  const { addReference, references, removeReference } =
    useReferenceDrafts(setFormError);

  const {
    addContextFiles,
    addContextFolder,
    contexts,
    pickContextFolder,
    removeContext,
  } = useContextDrafts(setFormError);

  const { isDragging } = useComposerDrop(
    formRef,
    { addContextFiles, addImages, addReference },
    onFolder
  );

  const fileRef = useRef<HTMLInputElement>(null);
  const contextFileRef = useRef<HTMLInputElement>(null);

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
    addContextFiles,
    addContextFolder,
    addImages,
    contextFileRef,
    contexts,
    fileRef,
    images,
    isDragging,
    onPromptPaste,
    pickContextFolder,
    references,
    removeContext,
    removeImage,
    removeReference,
  };
};

export { useComposerAttachments };

export type { ComposerAttachments };
