import type { ReactElement } from "react";
import { useCallback } from "react";

import { copy } from "./copy.js";
import { Icon } from "./deps.js";
import { fire } from "./fire.js";
import type { CommentsControl } from "./use-comments.js";

const toChatLabel = (isPreparing: boolean, count: number): string => {
  if (isPreparing) {
    return "Preparing…";
  }

  return `Send ${count} to chat`;
};

const ChatPickBar = ({
  tone,
  control,
}: {
  tone: string;
  control: CommentsControl;
}): ReactElement | null => {
  const count = control.picked.length;
  const { clearPicked, picked, toChat } = control;

  const clear = useCallback((): void => {
    clearPicked();
  }, [clearPicked]);

  const sendToChat = useCallback((): void => {
    fire(() => toChat(picked));
  }, [picked, toChat]);

  if (count === 0) {
    return null;
  }

  return (
    <div
      className={`comments-pick-bar ${tone}`}
      role="toolbar"
      aria-label={copy.selected}
      data-testid="comments-pick-bar"
    >
      <span className="label">
        {count} {copy.textSelected}
      </span>
      <button type="button" className="btn small ghost" onClick={clear}>
        {copy.textClear}
      </button>
      <span className="spacer" />
      <button
        type="button"
        className="btn small primary"
        data-testid="send-to-chat"
        disabled={control.preparing}
        onClick={sendToChat}
      >
        <Icon name="chat" size={14} />
        {toChatLabel(control.preparing, count)}
      </button>
    </div>
  );
};

export { ChatPickBar };
