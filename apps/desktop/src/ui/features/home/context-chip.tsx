import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { ChipRemoveButton } from "./chip-remove-button.js";
import type { ContextDraft } from "./context-drafts-model.js";
import { copy } from "./copy.js";

const toIconName = (
  kind: ContextDraft["kind"]
): "file" | "folder" | "globe" => {
  if (kind === "folder") {
    return "folder";
  }

  if (kind === "url") {
    return "globe";
  }

  return "file";
};

const ContextChip = ({
  context,
  onRemove,
}: {
  readonly context: ContextDraft;
  readonly onRemove: (id: string) => void;
}): ReactElement => {
  const handleRemove = useCallback((): void => {
    onRemove(context.id);
  }, [context.id, onRemove]);

  return (
    <li
      className="home-chip reference"
      data-tip={`${copy.referenceMaterialTip}${context.path ?? context.url ?? context.label}`}
      data-testid="context-chip"
    >
      <Icon name={toIconName(context.kind)} size={14} />
      <span className="home-chip-label">{copy.labelReferenceMaterial}</span>
      <span className="truncate home-chip-host">{context.label}</span>
      <ChipRemoveButton
        label={`Remove ${context.label}`}
        onRemove={handleRemove}
      />
    </li>
  );
};

export { ContextChip };
