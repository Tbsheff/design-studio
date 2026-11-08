import { useCallback } from "react";
import type { ReactElement } from "react";

import { Chip } from "./chip.js";
import { COPY } from "./copy.js";
import type { DraftForm, Patch } from "./new-design-system-values.js";

const toImageKey = (image: File): string =>
  `${image.name}-${image.size}-${image.lastModified}`;

const DropChips = ({
  form,
  set,
}: {
  form: DraftForm;
  set: (patch: Patch) => void;
}): ReactElement => {
  const { designMdFile, images, tokensFile } = form;

  const removeImage = useCallback(
    (value: string): void => {
      const at = Number(value);

      set({ images: [...images.slice(0, at), ...images.slice(at + 1)] });
    },
    [images, set]
  );

  const removeTokens = useCallback(
    (): void => set({ tokensFile: null }),
    [set]
  );

  const removeMarkdown = useCallback(
    (): void => set({ designMd: "", designMdFile: null }),
    [set]
  );

  return (
    <ul className="nds-chips" aria-label={COPY.labelAddedFiles}>
      {images.map((image, at) => (
        <Chip
          key={toImageKey(image)}
          icon="image"
          label={image.name}
          value={String(at)}
          onRemove={removeImage}
        />
      ))}
      {tokensFile && (
        <Chip
          icon="token"
          label={tokensFile.name}
          value=""
          onRemove={removeTokens}
        />
      )}
      {designMdFile && (
        <Chip
          icon="doc"
          label={designMdFile}
          value=""
          onRemove={removeMarkdown}
        />
      )}
    </ul>
  );
};

export { DropChips };
