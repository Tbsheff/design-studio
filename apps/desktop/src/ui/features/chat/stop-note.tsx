import type { ReactElement } from "react";

import type { RunView } from "./run-state-model.js";
import { stopNote } from "./stop-note-model.js";

const StopNote = ({ run }: { run: RunView }): ReactElement | null => {
  const note = stopNote(run);

  if (!note) {
    return null;
  }

  return (
    <p className="run-no-changes" data-testid="run-stop-note">
      {note}
    </p>
  );
};

export { StopNote };
