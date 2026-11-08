import { Icon } from "@design-studio/ui";
import { useEffect, useId, useRef, useState } from "react";
import type {
  ClipboardEvent,
  DragEvent,
  FormEvent,
  ReactElement,
  ReactNode,
} from "react";

import { copy } from "./copy.js";

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

const MAX_IMAGES = 4;
const MAX_REFERENCES = 3;
const MAX_IMAGE_BYTES = Math.floor(3.75 * 1024 * 1024);

const imageProblem = (file: File): string | null => {
  if (!IMAGE_TYPES.includes(file.type)) {
    return `${file.name} is not a PNG, JPEG, GIF or WebP image.`;
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return `${file.name} is larger than 3.75 MB. Attach a smaller image.`;
  }

  return null;
};

const ComposerAlert = ({
  children,
  onClose,
}: {
  readonly children: ReactNode;
  readonly onClose: () => void;
}): ReactElement => (
  <div className="alert error composer-alert" role="alert">
    <span className="composer-alert-text">{children}</span>
    <button
      type="button"
      className="icon-btn composer-alert-close"
      aria-label={copy.dismiss}
      onClick={onClose}
    >
      <Icon name="close" size={12} />
    </button>
  </div>
);

interface ImageDraft {
  readonly id: string;
  readonly file: File;
  readonly url: string;
}

interface ReferenceDraft {
  readonly url: string;
  readonly host: string;
}

const soleUrl = (text: string): ReferenceDraft | null => {
  const trimmed = text.trim();

  if (!/^https?:\/\/\S+$/iu.test(trimmed)) {
    return null;
  }

  try {
    const url = new URL(trimmed);

    return { host: url.host.replace(/^www\./u, ""), url: url.href };
  } catch {
    return null;
  }
};

const imageFiles = (list: FileList | File[] | null | undefined): File[] =>
  [...(list ?? [])].filter((file) => IMAGE_TYPES.includes(file.type));

const ComposerChips = ({
  lead,
  images,
  references,
  onRemoveImage,
  onRemoveReference,
}: {
  readonly lead?: ReactNode;
  readonly images: ImageDraft[];
  readonly references: ReferenceDraft[];
  readonly onRemoveImage: (id: string) => void;
  readonly onRemoveReference: (url: string) => void;
}): ReactElement | null => {
  if (!lead && images.length === 0 && references.length === 0) {
    return null;
  }

  return (
    <ul className="home-chips" aria-label={copy.attachedToThisPrompt}>
      {lead}
      {images.map((image) => (
        <li
          key={image.id}
          className="home-chip image"
          data-tip={image.file.name}
        >
          <img src={image.url} alt="" />
          <span className="truncate">{image.file.name}</span>
          <button
            type="button"
            className="home-chip-remove"
            aria-label={`Remove ${image.file.name}`}
            onClick={() => onRemoveImage(image.id)}
          >
            <Icon name="close" size={12} />
          </button>
        </li>
      ))}
      {references.map((reference) => (
        <li
          key={reference.url}
          className="home-chip reference"
          data-tip={`Use as reference: ${reference.url}`}
        >
          <Icon name="globe" size={14} />
          <span className="home-chip-label">{copy.labelUseAsReference}</span>
          <span className="truncate home-chip-host">{reference.host}</span>
          <button
            type="button"
            className="home-chip-remove"
            aria-label={`Remove ${reference.host}`}
            onClick={() => onRemoveReference(reference.url)}
          >
            <Icon name="close" size={12} />
          </button>
        </li>
      ))}
    </ul>
  );
};

const useComposerAttachments = (
  setFormError: (message: string | null) => void,
  onFolder?: (data: DataTransfer) => boolean
) => {
  const [images, setImages] = useState<ImageDraft[]>([]);
  const [references, setReferences] = useState<ReferenceDraft[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const imagesRef = useRef(images);
  imagesRef.current = images;
  useEffect(
    () => (): void =>
      imagesRef.current.forEach((image) => URL.revokeObjectURL(image.url)),
    []
  );

  const addImages = (picked: File[]): void => {
    if (picked.length === 0) {
      return;
    }

    const problems = picked
      .map(imageProblem)
      .filter((problem): problem is string => problem !== null);

    if (problems.length > 0) {
      setFormError(problems.join(" "));
    }

    const files = picked.filter((file) => imageProblem(file) === null);

    if (files.length === 0) {
      return;
    }

    setImages((current) => {
      const room = Math.max(0, MAX_IMAGES - current.length);

      if (files.length > room) {
        setFormError(`You can attach up to ${MAX_IMAGES} images.`);
      }

      return [
        ...current,
        ...files.slice(0, room).map((file) => ({
          file,
          id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`,
          url: URL.createObjectURL(file),
        })),
      ];
    });
  };

  const addReference = (reference: ReferenceDraft): void => {
    setReferences((current) => {
      if (current.some((item) => item.url === reference.url)) {
        return current;
      }

      if (current.length >= MAX_REFERENCES) {
        setFormError(`You can add up to ${MAX_REFERENCES} reference pages.`);

        return current;
      }

      return [...current, reference];
    });
  };

  const removeImage = (id: string): void =>
    setImages((current) => {
      const gone = current.find((image) => image.id === id);

      if (gone) {
        URL.revokeObjectURL(gone.url);
      }

      return current.filter((image) => image.id !== id);
    });

  const onPromptPaste = (event: ClipboardEvent<HTMLTextAreaElement>): void => {
    const files = imageFiles(event.clipboardData.files);

    if (files.length > 0) {
      event.preventDefault();
      addImages(files);

      return;
    }

    const reference = soleUrl(event.clipboardData.getData("text/plain"));

    if (reference) {
      event.preventDefault();
      addReference(reference);
    }
  };

  const onDragOver = (event: DragEvent<HTMLFormElement>): void => {
    if (
      ![...event.dataTransfer.types].some(
        (type) => type === "Files" || type === "text/uri-list"
      )
    ) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";

    if (!dragging) {
      setDragging(true);
    }
  };

  const onDrop = (event: DragEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setDragging(false);

    if (onFolder?.(event.dataTransfer)) {
      return;
    }

    const files = [...event.dataTransfer.files];

    if (files.length > 0) {
      addImages(files);

      return;
    }

    const reference = soleUrl(
      event.dataTransfer.getData("text/uri-list").split("\n")[0] ?? ""
    );

    if (reference) {
      addReference(reference);
    }
  };

  const removeReference = (url: string): void =>
    setReferences((current) => current.filter((item) => item.url !== url));

  const dropHandlers = {
    onDragLeave: (event: DragEvent<HTMLFormElement>) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
        setDragging(false);
      }
    },
    onDragOver,
    onDrop,
  };

  return {
    addImages,
    dragging,
    dropHandlers,
    fileRef,
    images,
    onPromptPaste,
    references,
    removeImage,
    removeReference,
  };
};

export {
  ComposerAlert,
  ComposerChips,
  IMAGE_TYPES,
  MAX_IMAGES,
  MAX_IMAGE_BYTES,
  MAX_REFERENCES,
  imageFiles,
  imageProblem,
  soleUrl,
  useComposerAttachments,
};

export type { ImageDraft, ReferenceDraft };
