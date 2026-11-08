import { useCallback, useMemo } from "react";

import { canPickForChat } from "./deps.js";
import type { DesignComment } from "./deps.js";
import { fire } from "./fire.js";
import { focusLater } from "./focus-later.js";
import type { CommentsControl } from "./use-comments.js";

interface OpenHandlers {
  readonly onClose: () => void;
  readonly onDelete: () => void;
  readonly onDeleteReply: (replyId: string) => void;
  readonly onFix: (() => void) | null;
  readonly onReopen: () => void;
  readonly onReply: (text: string) => Promise<boolean>;
  readonly onResolve: () => void;
  readonly onSave: (text: string) => void;
  readonly onSend: () => void;
}

const toFix = (
  comment: DesignComment,
  fix: () => void
): (() => void) | null => {
  if (canPickForChat(comment.status)) {
    return fix;
  }

  return null;
};

const useOpenComment = (
  comment: DesignComment,
  control: CommentsControl
): OpenHandlers => {
  const { id } = comment;
  const { remove, removeReply, reply, send } = control;
  const { setOpenId, toChat, update } = control;

  const onSend = useCallback((): void => {
    setOpenId(null);
    fire(() => send([id]));
  }, [id, send, setOpenId]);

  const fix = useCallback((): void => {
    setOpenId(null);
    fire(() => toChat([id]));
  }, [id, setOpenId, toChat]);

  const onSave = useCallback(
    (text: string): void => fire(() => update(id, { text })),
    [id, update]
  );

  const onResolve = useCallback((): void => {
    setOpenId(null);
    fire(() => update(id, { status: "resolved" }));
  }, [id, setOpenId, update]);

  const onReopen = useCallback(
    (): void => fire(() => update(id, { status: "queued" })),
    [id, update]
  );

  const onReply = useCallback(
    (text: string): Promise<boolean> => reply(id, text),
    [id, reply]
  );

  const onDeleteReply = useCallback(
    (replyId: string): void => fire(() => removeReply(id, replyId)),
    [id, removeReply]
  );

  const onDelete = useCallback(
    (): void => fire(() => remove(id)),
    [id, remove]
  );

  const onClose = useCallback((): void => {
    setOpenId(null);
    focusLater(`[data-comment-id="${id}"]`);
  }, [id, setOpenId]);

  const onFix = toFix(comment, fix);

  return useMemo(
    () => ({
      onClose,
      onDelete,
      onDeleteReply,
      onFix,
      onReopen,
      onReply,
      onResolve,
      onSave,
      onSend,
    }),
    [
      onFix,
      onClose,
      onDelete,
      onDeleteReply,
      onReopen,
      onReply,
      onResolve,
      onSave,
      onSend,
    ]
  );
};

export { useOpenComment };

export type { OpenHandlers };
