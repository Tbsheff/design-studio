import type { ReactElement, ReactNode } from "react";

import type { ImageDraft, ReferenceDraft } from "./composer-drafts-model.js";
import { copy } from "./copy.js";
import { ImageChip } from "./image-chip.js";
import { ReferenceChip } from "./reference-chip.js";

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
        <ImageChip key={image.id} image={image} onRemove={onRemoveImage} />
      ))}
      {references.map((reference) => (
        <ReferenceChip
          key={reference.url}
          reference={reference}
          onRemove={onRemoveReference}
        />
      ))}
    </ul>
  );
};

export { ComposerChips };
