import { useCallback } from "react";
import type { ReactElement } from "react";

import { ChipRemoveButton } from "./chip-remove-button.js";
import type { ImageDraft } from "./composer-drafts-model.js";

const ImageChip = ({
  image,
  onRemove,
}: {
  readonly image: ImageDraft;
  readonly onRemove: (id: string) => void;
}): ReactElement => {
  const handleRemove = useCallback((): void => {
    onRemove(image.id);
  }, [image.id, onRemove]);

  return (
    <li className="home-chip image" data-tip={image.file.name}>
      <img src={image.url} alt="" />
      <span className="truncate">{image.file.name}</span>
      <ChipRemoveButton
        label={`Remove ${image.file.name}`}
        onRemove={handleRemove}
      />
    </li>
  );
};

export { ImageChip };
