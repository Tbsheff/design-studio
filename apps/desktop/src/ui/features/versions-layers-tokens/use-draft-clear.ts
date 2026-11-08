import { useCallback, useEffect } from "react";
import type { RefObject } from "react";

import type { PendingMap } from "./token-draft.js";

interface DraftClearInput {
  readonly broadcastCss: (css: string) => void;
  readonly clearHistory: () => void;
  readonly onScopeEnd: () => void;
  readonly pendingRef: RefObject<PendingMap>;
  readonly resetErrors: () => void;
  readonly scope: string;
  readonly setCommitError: (message: string | null) => void;
  readonly setPending: (map: PendingMap) => void;
  readonly stop: () => void;
}

interface DraftClear {
  readonly clearDraft: () => void;
  readonly reset: () => void;
}

const useDraftClear = (input: DraftClearInput): DraftClear => {
  const { broadcastCss, clearHistory, pendingRef, resetErrors } = input;
  const { onScopeEnd, scope, setCommitError, setPending, stop } = input;

  const clearDraft = useCallback((): void => {
    stop();
    clearHistory();
    pendingRef.current = {};
    setPending({});
    resetErrors();
    setCommitError(null);
  }, [clearHistory, pendingRef, resetErrors, setCommitError, setPending, stop]);

  const reset = useCallback((): void => {
    clearDraft();
    broadcastCss("");
  }, [broadcastCss, clearDraft]);

  useEffect(() => {
    const active = scope !== "";

    return (): void => {
      if (active) {
        reset();
        onScopeEnd();
      }
    };
  }, [onScopeEnd, reset, scope]);

  return { clearDraft, reset };
};

export { useDraftClear };

export type { DraftClear };
