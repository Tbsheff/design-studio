import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { Icon } from "./deps.js";

const PopoverFoot = ({
  busy,
  changed,
  onSave,
  onSend,
}: {
  busy: boolean;
  changed: boolean;
  onSave: () => void;
  onSend: () => void;
}): ReactElement => (
  <div className="comment-card-foot">
    {changed && (
      <button type="button" className="thread-text-btn" onClick={onSave}>
        {copy.textSave}
      </button>
    )}
    {!changed && (
      <span className="comment-card-note">{copy.textSavedOnTheCanvas}</span>
    )}
    <span className="spacer" />
    <button
      type="button"
      className="thread-text-btn primary"
      disabled={busy}
      onClick={onSend}
    >
      <Icon name="arrowUp" size={13} />
      {copy.textSendToClaude}
    </button>
  </div>
);

export { PopoverFoot };
