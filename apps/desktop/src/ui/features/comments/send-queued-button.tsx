import type { ReactElement } from "react";
import { useCallback } from "react";

import { fire } from "./fire.js";
import type { CommentsControl } from "./use-comments.js";

const toSendLabel = (isSending: boolean, count: number): string => {
  if (isSending) {
    return "Sending…";
  }

  return `Send ${count} queued`;
};

const SendQueuedButton = ({
  tone,
  control,
}: {
  tone: string;
  control: CommentsControl;
}): ReactElement => {
  const count = control.queued.length;
  const { send } = control;

  const sendAll = useCallback((): void => {
    fire(() => send());
  }, [send]);

  return (
    <button
      type="button"
      className={`btn small primary ${tone}`}
      disabled={count === 0 || control.sending}
      onClick={sendAll}
    >
      {toSendLabel(control.sending, count)}
    </button>
  );
};

export { SendQueuedButton };
