import type { ReactElement } from "react";
import { useCallback, useState, useTransition } from "react";

import { copy } from "./copy.js";
import type { DesignComment } from "./deps.js";
import { GrowingArea } from "./growing-area.js";

const ReplyBox = ({
  comment,
  onReply,
}: {
  comment: DesignComment;
  onReply: (text: string) => Promise<boolean>;
}): ReactElement => {
  const [text, setText] = useState("");
  const [busy, startTransition] = useTransition();

  const send = useCallback((): void => {
    if (busy || text.trim() === "") {
      return;
    }

    startTransition(async () => {
      if (await onReply(text)) {
        setText("");
      }
    });
  }, [busy, onReply, text]);

  return (
    <div className="comment-field reply">
      <GrowingArea
        areaClass="comment-reply-input"
        label={`Reply to comment ${comment.n}`}
        placeholder={copy.reply}
        value={text}
        disabled={busy}
        onChange={setText}
        onEnter={send}
      />
    </div>
  );
};

export { ReplyBox };
