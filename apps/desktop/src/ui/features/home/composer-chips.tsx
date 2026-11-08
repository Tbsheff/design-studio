import type { ReactElement, RefObject } from "react";

import type { AppChip } from "./app-chip-model.js";
import type { ImageDraft, ReferenceDraft } from "./composer-drafts-model.js";
import { ContextChip } from "./context-chip.js";
import type { ContextDraft } from "./context-drafts-model.js";
import { copy } from "./copy.js";
import { AppChipView } from "./home-app-chip.js";
import { ImageChip } from "./image-chip.js";
import { ReferenceChip } from "./reference-chip.js";

const ComposerChips = ({
  chip,
  isChipMenuOpen,
  chipTriggerRef,
  onChipMenu,
  onChipRemove,
  contexts,
  images,
  references,
  onRemoveContext,
  onRemoveImage,
  onRemoveReference,
}: {
  readonly chip: AppChip | null;
  readonly isChipMenuOpen: boolean;
  readonly chipTriggerRef: RefObject<HTMLButtonElement | null>;
  readonly onChipMenu: () => void;
  readonly onChipRemove: () => void;
  readonly contexts: ContextDraft[];
  readonly images: ImageDraft[];
  readonly references: ReferenceDraft[];
  readonly onRemoveContext: (id: string) => void;
  readonly onRemoveImage: (id: string) => void;
  readonly onRemoveReference: (url: string) => void;
}): ReactElement | null => {
  if (
    !chip &&
    images.length === 0 &&
    references.length === 0 &&
    contexts.length === 0
  ) {
    return null;
  }

  return (
    <ul className="home-chips" aria-label={copy.attachedToThisPrompt}>
      {chip && (
        <AppChipView
          chip={chip}
          isMenuOpen={isChipMenuOpen}
          onMenu={onChipMenu}
          onRemove={onChipRemove}
          triggerRef={chipTriggerRef}
        />
      )}
      {images.map((image) => (
        <ImageChip key={image.id} image={image} onRemove={onRemoveImage} />
      ))}
      {contexts.map((context) => (
        <ContextChip
          key={context.id}
          context={context}
          onRemove={onRemoveContext}
        />
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
