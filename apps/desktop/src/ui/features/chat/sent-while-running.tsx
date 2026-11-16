import type { ReactElement } from "react";

import { copy } from "./copy.js";

const toNoteStatus = (isUsed: boolean): string => {
  if (isUsed) {
    return copy.noteUsed;
  }

  return copy.noteNotUsed;
};

const SentWhileRunning = ({
  text,
  isUsed,
  isRunning,
}: {
  readonly text: string;
  readonly isUsed: boolean;
  readonly isRunning: boolean;
}): ReactElement => (
  <div className="msg-inline-user" data-testid="sent-while-running">
    <span className="msg-inline-label">{copy.youWhileItRan}</span>
    <p className="whitespace-pre-wrap wrap-anywhere">{text}</p>
    {!isRunning && (
      <span
        className="msg-inline-status"
        data-used={isUsed}
        data-testid="note-status"
      >
        {toNoteStatus(isUsed)}
      </span>
    )}
  </div>
);

export { SentWhileRunning };
