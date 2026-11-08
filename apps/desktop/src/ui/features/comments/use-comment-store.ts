import { useEffect, useRef, useState } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";

import { toBase } from "./comments-api.js";
import { errorText, json, useProjectEvents } from "./deps.js";
import type { DesignComment } from "./deps.js";
import { useLatest } from "./use-latest.js";

interface CommentsStore {
  readonly afterRun: MutableRefObject<string[]>;
  readonly comments: DesignComment[];
  readonly didRef: MutableRefObject<string | null>;
  readonly listRef: MutableRefObject<DesignComment[]>;
  readonly notice: string | null;
  readonly openId: string | null;
  readonly repinId: string | null;
  readonly setComments: Dispatch<SetStateAction<DesignComment[]>>;
  readonly setNotice: Dispatch<SetStateAction<string | null>>;
  readonly setOpenId: Dispatch<SetStateAction<string | null>>;
  readonly setRepinId: Dispatch<SetStateAction<string | null>>;
}

const useCommentStore = (
  projectId: string,
  directionId: string | null
): CommentsStore => {
  const key = `${projectId}:${directionId}`;
  const [comments, setComments] = useState<DesignComment[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [repinId, setRepinId] = useState<string | null>(null);
  const [seenKey, setSeenKey] = useState(key);
  const afterRun = useRef<string[]>([]);
  const listRef = useLatest(comments);
  const didRef = useLatest(directionId);

  if (seenKey !== key) {
    setSeenKey(key);
    setComments([]);
    setOpenId(null);
    setRepinId(null);
    setNotice(null);
  }

  useEffect(() => {
    afterRun.current = [];

    if (!directionId) {
      return;
    }

    let alive = true;

    const load = async (): Promise<void> => {
      try {
        const list = await json<DesignComment[]>(
          "GET",
          toBase(projectId, directionId)
        );

        if (alive) {
          setComments(list);
        }
      } catch (error: unknown) {
        if (alive) {
          setNotice(errorText(error));
        }
      }
    };

    load();

    return (): void => {
      alive = false;
    };
  }, [projectId, directionId, afterRun]);

  useProjectEvents(projectId, (event) => {
    if (
      event.type === "comments.changed" &&
      event.directionId === didRef.current
    ) {
      setComments(event.comments);
    }
  });

  return {
    afterRun,
    comments,
    didRef,
    listRef,
    notice,
    openId,
    repinId,
    setComments,
    setNotice,
    setOpenId,
    setRepinId,
  };
};

export { useCommentStore };

export type { CommentsStore };
