import { useCallback, useEffect, useRef, useState } from "react";

import { IMAGE_MAX, patchImage } from "./comment-composer-model.js";
import type { ImageChip } from "./comment-composer-model.js";
import { copy } from "./copy.js";
import { api } from "./deps.js";

interface ComposerImages {
  add: (files: File[]) => void;
  images: ImageChip[];
  isPending: boolean;
  remove: (key: string) => void;
}

const revokeAll = (images: ImageChip[]): void => {
  for (const image of images) {
    URL.revokeObjectURL(image.url);
  }
};

const useComposerImages = (projectId: string): ComposerImages => {
  const [images, setImages] = useState<ImageChip[]>([]);
  const counter = useRef(0);
  const live = useRef(images);

  useEffect(() => {
    live.current = images;
  }, [images]);

  useEffect(() => (): void => revokeAll(live.current), []);

  const upload = useCallback(
    async (key: string, file: File): Promise<void> => {
      try {
        const attachment = await api.uploadAttachment(projectId, file);
        setImages((prev) => patchImage(prev, key, { id: attachment.id }));
      } catch {
        setImages((prev) => patchImage(prev, key, { failed: true }));
      }
    },
    [projectId]
  );

  const add = useCallback(
    (files: File[]): void => {
      const room = IMAGE_MAX - live.current.length;

      for (const file of files.slice(0, Math.max(0, room))) {
        counter.current += 1;
        const chipKey = `img${counter.current}`;

        const chip: ImageChip = {
          failed: false,
          id: null,
          key: chipKey,
          name: file.name || copy.textPastedImage,
          url: URL.createObjectURL(file),
        };

        setImages((prev) => [...prev, chip]);

        upload(chipKey, file);
      }
    },
    [upload]
  );

  const remove = useCallback((key: string): void => {
    setImages((prev) => {
      const gone = prev.find((image) => image.key === key);

      if (gone) {
        URL.revokeObjectURL(gone.url);
      }

      return prev.filter((image) => image.key !== key);
    });
  }, []);

  const isPending = images.some((image) => image.id === null && !image.failed);

  return { add, images, isPending, remove };
};

export { useComposerImages };

export type { ComposerImages };
