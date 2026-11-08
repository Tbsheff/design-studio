import { useCallback, useMemo, useState, useTransition } from "react";
import type { MutableRefObject } from "react";

import { toQueued } from "./comments-api.js";
import type { OnPrefill } from "./comments-control.js";
import { errorText } from "./deps.js";
import type { CommentPrefill, DesignComment } from "./deps.js";
import type { CommentCall } from "./use-comment-call.js";
import type { CommentsStore } from "./use-comment-store.js";
import { useLatest } from "./use-latest.js";

interface ChatContext {
  readonly call: CommentCall;
  readonly clearPicked: () => void;
  readonly onPrefill: OnPrefill | null;
  readonly store: CommentsStore;
}

interface CommentChat {
  readonly chatRef: MutableRefObject<string[]>;
  readonly inChat: DesignComment[];
  readonly preparing: boolean;
  readonly queued: DesignComment[];
  readonly toChat: (ids: string[]) => Promise<void>;
}

const postChat = async (
  context: ChatContext,
  ids: string[],
  addChatIds: (added: string[]) => void
): Promise<void> => {
  const { call, clearPicked, onPrefill, store } = context;

  try {
    const prefill = await call<CommentPrefill>("POST", "/prefill", { ids });

    if (prefill) {
      onPrefill?.(prefill);
      addChatIds(prefill.commentIds);
    }

    clearPicked();
    store.setNotice(null);
  } catch (error) {
    store.setNotice(errorText(error));
  }
};

const useCommentChat = (context: ChatContext): CommentChat => {
  const { comments } = context.store;
  const [chatIds, setChatIds] = useState<string[]>([]);
  const [preparing, startPreparing] = useTransition();
  const chatRef = useLatest(chatIds);
  const latest = useLatest(context);

  const queued = useMemo(() => {
    const inChatIds = new Set(chatIds);

    return toQueued(comments).filter((comment) => !inChatIds.has(comment.id));
  }, [comments, chatIds]);

  const inChat = useMemo(() => {
    const inChatIds = new Set(chatIds);

    return toQueued(comments).filter((comment) => inChatIds.has(comment.id));
  }, [comments, chatIds]);

  const addChatIds = useCallback((added: string[]): void => {
    setChatIds((prev) => [...new Set([...prev, ...added])]);
  }, []);

  const toChat = useCallback(
    async (ids: string[]): Promise<void> => {
      if (ids.length === 0) {
        return;
      }

      const pending = postChat(latest.current, ids, addChatIds);

      startPreparing(async () => {
        await pending;
      });

      await pending;
    },
    [latest, addChatIds]
  );

  return { chatRef, inChat, preparing, queued, toChat };
};

export { useCommentChat };

export type { ChatContext, CommentChat };
