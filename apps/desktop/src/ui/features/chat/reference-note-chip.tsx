import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { ReferenceNote } from "./reference-note-model.js";

const toStateText = (note: ReferenceNote): string => {
  if (note.state === "importing") {
    return `${copy.referenceAdding}${note.label}`;
  }

  if (note.state === "added") {
    return `${copy.referenceAdded}${note.label} (${note.message ?? ""})`;
  }

  return `${copy.referenceFailed}${note.label}. ${note.message ?? ""}`;
};

const ReferenceNoteChip = ({
  note,
  onDismiss,
}: {
  readonly note: ReferenceNote;
  readonly onDismiss: (id: string) => void;
}): ReactElement => {
  const dismiss = useCallback(() => onDismiss(note.id), [note.id, onDismiss]);

  return (
    <span
      className="skill-chip mention-chip"
      data-testid="reference-note"
      data-state={note.state}
    >
      <Icon name="folder" size={12} />
      {toStateText(note)}
      <button
        type="button"
        aria-label={`Remove ${note.label}`}
        onClick={dismiss}
      >
        <Icon name="close" size={11} />
      </button>
    </span>
  );
};

export { ReferenceNoteChip };
