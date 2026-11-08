import { useEffect, useRef, useState } from "react";

import { MAX_IMAGES, getImageProblem } from "../../domain/image-limits.js";
import { toChangedImages } from "./composer-drafts-model.js";
import type { ImageDraft } from "./composer-drafts-model.js";

interface ImageDrafts {
  readonly addImages: (picked: File[]) => void;
  readonly images: ImageDraft[];
  readonly removeImage: (id: string) => void;
}

const toProblems = (picked: File[]): string[] => {
  const problems: string[] = [];

  for (const file of picked) {
    const problem = getImageProblem(file);

    if (problem !== null) {
      problems.push(problem);
    }
  }

  return problems;
};

const useImageDrafts = (
  setFormError: (message: string | null) => void
): ImageDrafts => {
  const [images, setImages] = useState<ImageDraft[]>([]);
  const imagesRef = useRef(images);
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);
  useEffect(
    () => (): void => {
      toChangedImages(imagesRef.current, { kind: "clear" });
    },
    []
  );

  const addImages = (picked: File[]): void => {
    const problems = toProblems(picked);

    if (problems.length > 0) {
      setFormError(problems.join(" "));
    }

    const files = picked.filter((file) => getImageProblem(file) === null);

    if (files.length === 0) {
      return;
    }

    setImages((current) =>
      toChangedImages(current, {
        files,
        kind: "add",
        onFull: (): void =>
          setFormError(`You can attach up to ${MAX_IMAGES} images.`),
      })
    );
  };

  const removeImage = (imageId: string): void =>
    setImages((current) =>
      toChangedImages(current, { id: imageId, kind: "remove" })
    );

  return { addImages, images, removeImage };
};

export { useImageDrafts };

export type { ImageDrafts };
