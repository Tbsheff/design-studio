import type { ReactElement } from "react";

import { toStackNote } from "./space-stack-model.js";
import type { SpaceStack } from "./space-stack-model.js";

interface Props {
  readonly stack: SpaceStack;
}

const SpaceStackNote = ({ stack }: Props): ReactElement => {
  const note = toStackNote(stack);

  return (
    <p className="ins-note" data-tip={note.tip} data-tip-align="start">
      {note.text}
    </p>
  );
};

export { SpaceStackNote };
