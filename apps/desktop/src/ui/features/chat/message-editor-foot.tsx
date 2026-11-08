import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

const HINT_ICON_SIZE = 12;

const MessageEditorFoot = ({
  isReady,
  onCancel,
  onSend,
}: {
  isReady: boolean;
  onCancel: () => void;
  onSend: () => void;
}): ReactElement => (
  <div className="msg-editor-foot">
    <span className="msg-editor-hint">
      <Icon name="branch" size={HINT_ICON_SIZE} />
      {copy.sendsToANew}
    </span>
    <button type="button" className="btn ghost small" onClick={onCancel}>
      {copy.cancel}
    </button>
    <button
      type="button"
      className="btn small primary"
      disabled={!isReady}
      onClick={onSend}
    >
      {copy.send}
    </button>
  </div>
);

export { MessageEditorFoot };
