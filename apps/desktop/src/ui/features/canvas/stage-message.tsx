import type { ReactNode } from "react";

import type { StageNote } from "./canvas-helpers.js";
import { copy } from "./copy.js";

interface StageMessageProps {
  readonly note: StageNote;
  readonly covered: boolean;
  readonly urlError: string | null;
  readonly app: ReactNode;
}

const toVisibleNote = (note: StageNote, covered: boolean): StageNote => {
  if (covered) {
    return null;
  }

  return note;
};

const StageMessage = ({
  note: given,
  covered,
  urlError,
  app,
}: StageMessageProps): ReactNode => {
  const note = toVisibleNote(given, covered);

  if (urlError) {
    return <div className="stage-message">{urlError}</div>;
  }

  if (note === "building") {
    return (
      <output className="stage-message">
        <span className="spinner" aria-hidden="true" />
        {copy.buildingTheFirstVersion}
      </output>
    );
  }

  if (note === "empty") {
    return <output className="stage-message">{copy.noDesignYetSend}</output>;
  }

  return app;
};

export { StageMessage };
