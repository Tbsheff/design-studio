import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  startTransition,
} from "react";
import type { Dispatch, SetStateAction } from "react";

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

const useLatest = <Value>(value: Value): { readonly current: Value } => {
  const ref = useRef(value);
  ref.current = value;

  return ref;
};

interface UseRunSearchResult {
  readonly onClose: () => void;
  readonly onFound: () => void;
  readonly onPick: (runId: string) => void;
  readonly onQuery: Dispatch<SetStateAction<string>>;
  readonly open: boolean;
  readonly query: string;
  readonly target: string | null;
}

const useRunSearch = (available: boolean): UseRunSearchResult => {
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
    () => (): void => {
      chatSearchAvailable.set(false);
      chatSearchOpen.set(false);
    },
    []
  );

  const pick = useCallback(
    (runId: string) => {
      close();
      startTransition(async () => {
        if (await loadRunsThrough(runId)) {
          setTarget(runId);
        }
      });
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

interface UseTurnActionsResult {
  readonly actions: TurnActions | null;
  readonly titles: Record<string, string>;
}

const useTurnActions = (
  rewind: RewindControl | undefined
): UseTurnActionsResult => {
  const [titles, setTitles] = useState<Record<string, string>>({});
  const rewindRef = useLatest(rewind);
  const hasRewind = rewind !== undefined;

  const actions = useMemo<TurnActions | null>(() => {
    if (hasRewind) {
      return {
        dirtyCount: (): number => rewindRef.current?.dirtyCount ?? 0,
        onEditResend: (run, prompt, base): Promise<void> =>
          rewindRef.current?.onEditResend(run, prompt, base) ??
          Promise.resolve(),
        onRename: async (runId, title): Promise<void> => {
          const summary = await renameRun(runId, title);
          setTitles((prev) => ({ ...prev, [runId]: summary.title ?? "" }));
        },
        onRestore: (versionId): void => rewindRef.current?.onRestore(versionId),
      };
    }

    return null;
  }, [hasRewind, rewindRef]);

  return { actions, titles };
};

export { useLatest, usePolish, useRunSearch, useTurnActions };
