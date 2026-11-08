import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { QueueNotice } from "./queue-notice.js";
import { SendQueuedButton } from "./send-queued-button.js";
import type { CommentsControl } from "./use-comments.js";

const QueuedComposerBar = ({
  control,
  onShow,
}: {
  control: CommentsControl;
  onShow: () => void;
}): ReactElement | null => {
  const count = control.queued.length;

  if (count === 0 && !control.notice) {
    return null;
  }

  return (
    <div className="comments-queue-bar" data-testid="queued-bar">
      <span className="label">
        <button type="button" className="link" onClick={onShow}>
          {count} {copy.textQueued}
        </button>
        <QueueNotice notice={control.notice} />
      </span>
      {count > 0 && <SendQueuedButton tone="" control={control} />}
    </div>
  );
};

export { QueuedComposerBar };
