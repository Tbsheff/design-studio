import type { ReactElement } from "react";

import type { StyleValues } from "./css-value-model.js";
import { SnapNoteBar } from "./snap-note-bar.js";
import type { SnapNote, TokenUi } from "./use-token-snap.js";

const TokenNotes = (props: {
  readonly ui: TokenUi | null;
  readonly note: SnapNote | null;
  readonly onKeepRaw: (raw: Partial<StyleValues>) => void;
  readonly onDismiss: () => void;
}): ReactElement | null => {
  const { ui, note } = props;

  if (!ui || !note) {
    return null;
  }

  return (
    <SnapNoteBar
      note={note}
      onKeepRaw={props.onKeepRaw}
      onDismiss={props.onDismiss}
    />
  );
};

export { TokenNotes };
