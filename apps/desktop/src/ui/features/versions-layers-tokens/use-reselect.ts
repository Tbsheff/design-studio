import type { SelectionContext } from "@design-studio/contracts";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { RefObject } from "react";

import {
  RESELECT_MS,
  isReselectDone,
  toActiveReselect,
  toReselect,
} from "./layer-edits-model.js";
import type { LayerEditsOptions, Reselect } from "./layer-edits-types.js";
import { useLatestRef } from "./use-latest-ref.js";
import { useReselectPost } from "./use-reselect-post.js";

interface ReselectInput {
  readonly frontToken: string | null;
  readonly liveRef: RefObject<LayerEditsOptions>;
  readonly notify: (message: string) => void;
  readonly selection: SelectionContext[];
}

type ReselectStart = Omit<Reselect, "newFrame" | "until">;

interface ReselectApi {
  readonly beginReselect: (next: ReselectStart) => void;
  readonly clearReselect: () => void;
  readonly hasPendingMove: () => boolean;
  readonly isReselecting: boolean;
  readonly resolveReselect: (
    token: string,
    selection: SelectionContext
  ) => void;
  readonly sendReselect: () => void;
}

const useReselect = (input: ReselectInput): ReselectApi => {
  const { frontToken, liveRef, notify, selection } = input;
  const [pending, setPending] = useState<Reselect | null>(null);
  const active = toActiveReselect(pending, selection);
  const activeRef = useLatestRef(active);

  const clearReselect = useCallback((): void => {
    setPending(null);
  }, []);

  const hasPendingMove = useCallback(
    (): boolean => activeRef.current?.move === true,
    [activeRef]
  );

  const { expire, postReselect } = useReselectPost({
    activeRef,
    liveRef,
    notify,
    setPending,
  });

  const sendReselect = useCallback((): void => {
    if (activeRef.current) {
      postReselect(activeRef.current);
    }
  }, [activeRef, postReselect]);

  const resolveReselect = useCallback(
    (token: string, current: SelectionContext): void => {
      if (
        activeRef.current &&
        isReselectDone(activeRef.current, token, current)
      ) {
        setPending(null);
      }
    },
    [activeRef]
  );

  const beginReselect = useCallback(
    (next: ReselectStart): void => {
      const target = toReselect(next, liveRef.current.kind);

      setPending(target);

      globalThis.setTimeout(() => {
        expire(target);
      }, RESELECT_MS);

      postReselect(target);
    },
    [expire, liveRef, postReselect]
  );

  useEffect(sendReselect, [frontToken, sendReselect]);

  const isReselecting = active !== null;

  return useMemo(
    () => ({
      beginReselect,
      clearReselect,
      hasPendingMove,
      isReselecting,
      resolveReselect,
      sendReselect,
    }),
    [
      beginReselect,
      clearReselect,
      hasPendingMove,
      isReselecting,
      resolveReselect,
      sendReselect,
    ]
  );
};

export { useReselect };

export type { ReselectApi };
