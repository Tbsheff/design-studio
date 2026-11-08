import { useCallback, useEffect, useTransition } from "react";
import type { MutableRefObject } from "react";

import { describeWithTimeout, toQueued } from "./comments-api.js";
import type { DescribeAnchors } from "./comments-control.js";
import { ApiError, errorText } from "./deps.js";
import type { DesignComment } from "./deps.js";
import type { CommentCall } from "./use-comment-call.js";
import type { CommentsStore } from "./use-comment-store.js";
import { useLatest, writeRef } from "./use-latest.js";

const RUNNING_NOTICE = "Agent is running: queued";

const HTTP_CONFLICT = 409;

interface SendContext {
  readonly call: CommentCall;
  readonly chatRef: MutableRefObject<string[]>;
  readonly describeRef: MutableRefObject<DescribeAnchors | null>;
  readonly isRunning: boolean;
  readonly runningRef: MutableRefObject<boolean>;
  readonly store: CommentsStore;
}

interface CommentSend {
  readonly deliver: (
    created: DesignComment[],
    toClaude: boolean
  ) => Promise<void>;
  readonly send: (ids?: string[]) => Promise<void>;
  readonly sending: boolean;
}

const toSendNotice = (error: Error | ApiError): string => {
  const isBusy =
    error instanceof ApiError &&
    error.status === HTTP_CONFLICT &&
    error.tag === "run_in_progress";

  if (isBusy) {
    return RUNNING_NOTICE;
  }

  return errorText(error);
};

const toChosen = (
  list: DesignComment[],
  chatIds: string[],
  ids: string[] | null
): DesignComment[] => {
  if (ids) {
    const wanted = new Set(ids);

    return list.filter((comment) => wanted.has(comment.id));
  }

  const inChat = new Set(chatIds);

  return toQueued(list).filter((comment) => !inChat.has(comment.id));
};

const postSend = async (
  context: SendContext,
  chosen: DesignComment[]
): Promise<void> => {
  const { call, describeRef, store } = context;

  try {
    const contexts = await describeWithTimeout(
      describeRef.current,
      chosen.filter((comment) => !comment.drawing)
    );

    await call("POST", "/send", {
      contexts,
      ids: chosen.map((comment) => comment.id),
    });
    store.setNotice(null);
  } catch (error) {
    store.setNotice(toSendNotice(error as Error));
  }
};

const useCommentSend = (context: SendContext): CommentSend => {
  const { chatRef, isRunning, runningRef, store } = context;
  const { afterRun, listRef } = store;
  const [sending, startSending] = useTransition();
  const latest = useLatest(context);

  const send = useCallback(
    async (ids?: string[]): Promise<void> => {
      const chosen = toChosen(listRef.current, chatRef.current, ids ?? null);

      if (chosen.length === 0) {
        return;
      }

      const pending = postSend(latest.current, chosen);

      startSending(async () => {
        await pending;
      });

      await pending;
    },
    [latest, chatRef, listRef]
  );

  const deliver = useCallback(
    async (created: DesignComment[], toClaude: boolean): Promise<void> => {
      if (!toClaude || created.length === 0) {
        return;
      }

      const ids = created.map((comment) => comment.id);

      if (runningRef.current) {
        writeRef(afterRun, [...new Set([...afterRun.current, ...ids])]);

        return;
      }

      const delivered = new Set(ids);

      writeRef(listRef, [
        ...listRef.current.filter((comment) => !delivered.has(comment.id)),
        ...created,
      ]);
      await send(ids);
    },
    [afterRun, listRef, runningRef, send]
  );

  useEffect(() => {
    const queuedIds = new Set(
      toQueued(store.comments).map((comment) => comment.id)
    );

    writeRef(
      afterRun,
      afterRun.current.filter((id) => queuedIds.has(id))
    );
  }, [store.comments, afterRun]);

  useEffect(() => {
    if (isRunning || afterRun.current.length === 0) {
      return;
    }

    const waiting = new Set(afterRun.current);

    const ready = listRef.current.filter(
      (comment) => waiting.has(comment.id) && comment.status === "queued"
    );

    if (ready.length > 0) {
      send(ready.map((comment) => comment.id));
    }
  }, [isRunning, send, afterRun, listRef]);

  return { deliver, send, sending };
};

export { useCommentSend };

export type { CommentSend, SendContext };
