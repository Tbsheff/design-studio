import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import { MessageEditorFoot } from "./message-editor-foot.js";

const MIN_ROWS = 2;
const MAX_ROWS = 8;

const MessageEditor = ({
  initial,
  onCancel,
  onSend,
}: {
  initial: string;
  onCancel: () => void;
  onSend: (prompt: string) => void;
}): ReactElement => {
  const [text, setText] = useState(initial);
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const area = ref.current;

    if (!area) {
      return;
    }

    area.focus();
    area.setSelectionRange(area.value.length, area.value.length);
  }, []);

  const ready = text.trim() !== "";

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>): void => {
      event.stopPropagation();

      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();

        return;
      }

      const isEnter =
        event.key === "Enter" &&
        !event.shiftKey &&
        !event.nativeEvent.isComposing;

      if (!isEnter) {
        return;
      }

      event.preventDefault();

      if (ready) {
        onSend(text.trim());
      }
    },
    [onCancel, onSend, ready, text]
  );

  const updateText = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>): void =>
      setText(event.target.value),
    []
  );

  const sendText = useCallback(() => onSend(text.trim()), [onSend, text]);

  return (
    <div className="msg-editor" data-testid="message-editor">
      <textarea
        ref={ref}
        aria-label={copy.editMessage}
        rows={Math.min(MAX_ROWS, Math.max(MIN_ROWS, text.split("\n").length))}
        value={text}
        onChange={updateText}
        onKeyDown={handleKeyDown}
      />
      <MessageEditorFoot
        isReady={ready}
        onCancel={onCancel}
        onSend={sendText}
      />
    </div>
  );
};

export { MessageEditor };
