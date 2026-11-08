import { useCallback } from "react";

import { toMerged } from "./comment-merge.js";
import { errorText } from "./deps.js";
import type { DesignComment } from "./deps.js";
import type { EditContext } from "./use-comment-edits.js";

interface CommentReplies {
  readonly removeReply: (id: string, replyId: string) => Promise<void>;
  readonly reply: (id: string, text: string) => Promise<boolean>;
}

const useCommentReplies = (context: EditContext): CommentReplies => {
  const { call, store } = context;
  const { setComments, setNotice } = store;

  const merge = useCallback(
    (comment: DesignComment): void => {
      setComments((prev) => toMerged(prev, comment));
    },
    [setComments]
  );

  const reply = useCallback(
    async (id: string, text: string): Promise<boolean> => {
      const clean = text.trim();

      if (!clean) {
        return false;
      }

      try {
        const comment = await call<DesignComment>(
          "POST",
          `/${encodeURIComponent(id)}/replies`,
          { text: clean }
        );

        if (comment) {
          merge(comment);
        }

        return comment !== null;
      } catch (error) {
        setNotice(errorText(error));

        return false;
      }
    },
    [call, merge, setNotice]
  );

  const removeReply = useCallback(
    async (id: string, replyId: string): Promise<void> => {
      try {
        const comment = await call<DesignComment>(
          "DELETE",
          `/${encodeURIComponent(id)}/replies/${encodeURIComponent(replyId)}`
        );

        if (comment) {
          merge(comment);
        }
      } catch (error) {
        setNotice(errorText(error));
      }
    },
    [call, merge, setNotice]
  );

  return { removeReply, reply };
};

export { useCommentReplies };

export type { CommentReplies };
