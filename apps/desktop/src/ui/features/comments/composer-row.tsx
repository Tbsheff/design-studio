import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { Icon } from "./deps.js";
import { SendQueuedButton } from "./send-queued-button.js";
import type { CommentsControl } from "./use-comments.js";

const ComposerRow = ({
  control,
  isReady,
  onSubmit,
}: {
  control: CommentsControl;
  isReady: boolean;
  onSubmit: () => void;
}): ReactElement => (
  <div className="comments-composer-row">
    {control.queued.length > 0 && (
      <SendQueuedButton tone="ghost" control={control} />
    )}
    <span className="spacer" />
    <button
      type="button"
      className="btn small send"
      disabled={!isReady}
      onClick={onSubmit}
    >
      <Icon name="arrowUp" size={12} />
      {copy.comment}
    </button>
  </div>
);

export { ComposerRow };
