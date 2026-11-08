import type { ReactElement } from "react";

import { GROUP_ROLE } from "./aria-role-model.js";
import { copy } from "./copy.js";
import { ReferenceNoteChip } from "./reference-note-chip.js";
import type { ReferenceNote } from "./reference-note-model.js";

const ReferenceNotes = ({
  notes,
  onDismiss,
}: {
  readonly notes: ReferenceNote[];
  readonly onDismiss: (id: string) => void;
}): ReactElement | null => {
  if (notes.length === 0) {
    return null;
  }

  return (
    <div
      className="skill-chips"
      role={GROUP_ROLE}
      aria-label={copy.referencesForThis}
    >
      {notes.map((note) => (
        <ReferenceNoteChip key={note.id} note={note} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

export { ReferenceNotes };
