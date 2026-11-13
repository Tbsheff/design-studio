import type { ReactElement } from "react";

import type { SkipNote } from "./use-auto-layout.js";

interface Props {
  readonly note: SkipNote;
}

const AutoLayoutSkipNote = ({ note }: Props): ReactElement => (
  <p className="ins-note" data-tip={note.tip} data-tip-align="start">
    {note.text}
  </p>
);

export { AutoLayoutSkipNote };
