import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { StyleValues } from "./css-value-model.js";
import { NoteBar } from "./note-bar.js";
import type { SnapNote } from "./use-token-snap.js";

const SnapNoteBar = ({
  note,
  onKeepRaw,
  onDismiss,
}: {
  readonly note: SnapNote;
  readonly onKeepRaw: (raw: Partial<StyleValues>) => void;
  readonly onDismiss: () => void;
}): ReactElement => {
  const handleKeepRaw = useCallback(
    () => onKeepRaw(note.raw),
    [note, onKeepRaw]
  );

  return (
    <NoteBar onClose={onDismiss}>
      <span className="tk-note-text">
        {copy.snappedTo}
        <code>{note.cssVar}</code>
      </span>
      <span className="tk-note-sep" aria-hidden="true">
        {copy.separatorDot}
      </span>
      <button type="button" className="tk-note-action" onClick={handleKeepRaw}>
        {copy.keepRawValue}
      </button>
    </NoteBar>
  );
};

export { SnapNoteBar };
