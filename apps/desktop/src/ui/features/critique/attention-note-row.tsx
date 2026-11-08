import type { ReactElement } from "react";

import type { AttentionNoteView } from "./attention-model.js";

interface NoteProps {
  readonly note: AttentionNoteView;
}

const AttentionNoteRow = ({ note }: NoteProps): ReactElement => (
  <li className="review-row">
    <p className="review-msg">{note.message}</p>
  </li>
);

export { AttentionNoteRow };
