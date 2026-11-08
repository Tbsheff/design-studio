import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useLive } from "../../platform/live-store.js";
import type { TurnActions } from "./chat-rewind.js";
import {
  chatSearchAvailable,
  chatSearchOpen,
  focusChatSearchButton,
} from "./chat-search-model.js";
import type { PolishProps } from "./chat-turn-model.js";
import { loadRunsThrough, renameRun } from "./run-history-model.js";
import type { RunView } from "./run-state-model.js";
import type { RewindControl } from "./use-rewind.js";

const useLatest = <T>(value: T): { readonly current: T } => {
  const ref = useRef(value);
  ref.current = value;

  return ref;
};

const useRunSearch = (available: boolean) => {
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
    onClose: dismiss,
    onFound: found,
    onPick: pick,
    onQuery: setQuery,
    open: open && available,
    query,
    target,
  };
};

interface PolishInput {
  headVersionId: string | null;
  onApprovePlan: ((run: RunView) => void) | undefined;
  onPolish: () => void;
  onRetry: ((run: RunView) => void) | undefined;
  polishing: boolean;
}

const usePolish = (input: PolishInput): PolishProps => {
  const { headVersionId, onApprovePlan, onPolish, onRetry, polishing } = input;
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
      onApprovePlan: approve,
      onPolish: startPolish,
      onRetry: retry,
      running: polishing,
    }),
    [headVersionId, polishing, startPolish, retry, approve]
  );
};

const useTurnActions = (rewind: RewindControl | undefined) => {
  const [titles, setTitles] = useState<Record<string, string>>({});
  const rewindRef = useLatest(rewind);
  const hasRewind = rewind !== undefined;

  const actions = useMemo<TurnActions | null>(
    () =>
      hasRewind
        ? {
            dirtyCount: () => rewindRef.current?.dirtyCount ?? 0,
            onEditResend: (run, prompt, base) =>
              rewindRef.current?.onEditResend(run, prompt, base) ??
              Promise.resolve(),
            onRename: async (runId, title) => {
              const summary = await renameRun(runId, title);
              setTitles((prev) => ({ ...prev, [runId]: summary.title ?? "" }));
            },
            onRestore: (versionId) => rewindRef.current?.onRestore(versionId),
          }
        : null,
    [hasRewind, rewindRef]
  );

  return { actions, titles };
};

export { useLatest, usePolish, useRunSearch, useTurnActions };
