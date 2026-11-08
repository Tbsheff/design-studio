import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { ChipRemoveButton } from "./chip-remove-button.js";
import type { ReferenceDraft } from "./composer-drafts-model.js";
import { copy } from "./copy.js";

const ReferenceChip = ({
  reference,
  onRemove,
}: {
  readonly reference: ReferenceDraft;
  readonly onRemove: (url: string) => void;
}): ReactElement => {
  const handleRemove = useCallback((): void => {
    onRemove(reference.url);
  }, [onRemove, reference.url]);

  return (
    <li
      className="home-chip reference"
      data-tip={`Use as reference: ${reference.url}`}
    >
      <Icon name="globe" size={14} />
      <span className="home-chip-label">{copy.labelUseAsReference}</span>
      <span className="truncate home-chip-host">{reference.host}</span>
      <ChipRemoveButton
        label={`Remove ${reference.host}`}
        onRemove={handleRemove}
      />
    </li>
  );
};

export { ReferenceChip };
