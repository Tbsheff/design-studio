import { useCallback } from "react";

import { toQueued, toTarget } from "./comments-api.js";
import type { CommentPatch } from "./comments-control.js";
import { errorText } from "./deps.js";
import type { CommentTarget, SelectionContext } from "./deps.js";
import type { CommentCall } from "./use-comment-call.js";
import type { CommentsStore } from "./use-comment-store.js";

interface EditContext {
  readonly call: CommentCall;
  readonly store: CommentsStore;
}

interface CommentEdits {
  readonly move: (id: string, delta: -1 | 1) => Promise<void>;
  readonly remove: (id: string) => Promise<void>;
  readonly repin: (
    id: string,
    selection: SelectionContext,
    offset?: CommentTarget["offset"]
  ) => Promise<void>;
  readonly update: (id: string, patch: CommentPatch) => Promise<void>;
}

const toSwapped = (ids: string[], at: number, to: number): string[] | null => {
  const atId = ids[at];
  const toId = ids[to];

  if (!atId || !toId) {
    return null;
  }

  const swapped = [...ids];
  swapped[at] = toId;
  swapped[to] = atId;

  return swapped;
};

const useCommentEdits = (context: EditContext): CommentEdits => {
  const { call, store } = context;
  const { listRef, setNotice, setOpenId, setRepinId } = store;

  const update = useCallback(
    async (id: string, patch: CommentPatch): Promise<void> => {
      try {
        await call("PATCH", `/${encodeURIComponent(id)}`, patch);
      } catch (error) {
        setNotice(errorText(error));
      }
    },
    [call, setNotice]
  );

  const remove = useCallback(
    async (id: string): Promise<void> => {
      try {
        await call("DELETE", `/${encodeURIComponent(id)}`);
        setOpenId((current) => {
          if (current === id) {
            return null;
          }

          return current;
        });
      } catch (error) {
        setNotice(errorText(error));
      }
    },
    [call, setNotice, setOpenId]
  );

  const move = useCallback(
    async (id: string, delta: -1 | 1): Promise<void> => {
      const ids = toQueued(listRef.current).map((comment) => comment.id);
      const at = ids.indexOf(id);
      const swapped = toSwapped(ids, at, at + delta);

      if (!swapped) {
        return;
      }

      try {
        await call("POST", "/reorder", { ids: swapped });
      } catch (error) {
        setNotice(errorText(error));
      }
    },
    [call, listRef, setNotice]
  );

  const repin = useCallback(
    async (
      id: string,
      selection: SelectionContext,
      offset?: CommentTarget["offset"]
    ): Promise<void> => {
      const comment = listRef.current.find((item) => item.id === id);
      setRepinId(null);

      if (!comment) {
        return;
      }

      const target = toTarget(selection, offset ?? null);
      const patch: CommentPatch = { context: selection, target };

      if (comment.status === "orphaned") {
        patch.status = "queued";
      }

      await update(id, patch);
    },
    [listRef, setRepinId, update]
  );

  return { move, remove, repin, update };
};

export { useCommentEdits };

export type { CommentEdits, EditContext };
