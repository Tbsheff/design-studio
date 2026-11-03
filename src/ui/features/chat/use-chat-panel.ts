import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  chatSearchAvailable,
  chatSearchOpen,
  focusChatSearchButton,
} from "../../chatSearchState.js";
import { useLive } from "../../platform/live-store.js";
import { loadRunsThrough, renameRun } from "../../runHistoryApi.js";
import type { RunView } from "../../runState.js";
import type { RewindControl } from "../../useRewind.js";
import type { TurnActions } from "./chat-rewind.js";
import type { PolishProps } from "./chat-turn-model.js";

function useLatest<T>(value: T): { readonly current: T } {
  const ref = useRef(value);
  ref.current = value;

  return ref;
}

function useRunSearch(available: boolean) {
  const open = useLive(chatSearchOpen);
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState<string | null>(null);

  const close = useCallback(() => {
    chatSearchOpen.set(false);
    setQuery("");
  }, []);

  useEffect(() => {
    chatSearchAvailable.set(available);

    if (!available) {
      chatSearchOpen.set(false);
    }
  }, [available]);
  useEffect(
    () => () => {
      chatSearchAvailable.set(false);
      chatSearchOpen.set(false);
    },
    []
  );

  const pick = useCallback(
    (runId: string) => {
      close();
      void loadRunsThrough(runId).then((found) => found && setTarget(runId));
    },
    [close]
  );

  const found = useCallback(() => setTarget(null), []);

  const dismiss = useCallback(() => {
    close();
    focusChatSearchButton();
  }, [close]);

  return {
    open: open && available,
    query,
    target,
    onClose: dismiss,
    onQuery: setQuery,
    onPick: pick,
    onFound: found,
  };
}

function usePolish(
  headVersionId: string | null,
  polishing: boolean,
  onPolish: () => void,
  onRetry: ((run: RunView) => void) | undefined,
  onApprovePlan: ((run: RunView) => void) | undefined
): PolishProps {
  const polishRef = useLatest(onPolish);
  const retryRef = useLatest(onRetry);

  const retry = useCallback(
    (run: RunView) => retryRef.current?.(run),
    [retryRef]
  );

  const approveRef = useLatest(onApprovePlan);

  const approve = useCallback(
    (run: RunView) => approveRef.current?.(run),
    [approveRef]
  );

  const startPolish = useCallback(() => polishRef.current(), [polishRef]);

  return useMemo(
    () => ({
      headVersionId,
      running: polishing,
      onPolish: startPolish,
      onRetry: retry,
      onApprovePlan: approve,
    }),
    [headVersionId, polishing, startPolish, retry, approve]
  );
}

function useTurnActions(rewind: RewindControl | undefined) {
  const [titles, setTitles] = useState<Record<string, string>>({});
  const rewindRef = useLatest(rewind);
  const hasRewind = rewind !== undefined;

  const actions = useMemo<TurnActions | null>(
    () =>
      hasRewind
        ? {
            onRestore: (versionId) => rewindRef.current?.onRestore(versionId),
            onEditResend: (run, prompt, base) =>
              rewindRef.current?.onEditResend(run, prompt, base) ??
              Promise.resolve(),
            dirtyCount: () => rewindRef.current?.dirtyCount ?? 0,
            onRename: async (runId, title) => {
              const summary = await renameRun(runId, title);
              setTitles((prev) => ({ ...prev, [runId]: summary.title ?? "" }));
            },
          }
        : null,
    [hasRewind, rewindRef]
  );

  return { titles, actions };
}

export { useLatest, useRunSearch, usePolish, useTurnActions };
