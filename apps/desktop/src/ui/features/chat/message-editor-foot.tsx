import { Button, Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

const HINT_ICON_SIZE = 12;

const toSendReason = (isReady: boolean): string | null => {
  if (isReady) {
    return null;
  }

  return copy.sendNeedsText;
};

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
    <Button
      disabledReason={toSendReason(isReady)}
      isLoading={false}
      label={null}
      onClick={onSend}
      size="sm"
      tip={null}
      variant="primary"
    >
      {copy.send}
    </Button>
  </div>
);

export { MessageEditorFoot };
