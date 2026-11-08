import { useCallback, useRef, useState } from "react";
import type { RefObject } from "react";

import { toChanges } from "./token-draft.js";
import type { PendingMap } from "./token-draft.js";
import { previewWithFallback } from "./token-preview-request.js";
import type { ErrorMap } from "./token-preview-request.js";

const PREVIEW_THROTTLE_MS = 60;

interface PreviewScopeRef {
  readonly directionId: string | null;
  readonly projectId: string;
}

interface TokenPreviewInput {
  readonly broadcastCss: (css: string) => void;
  readonly pendingRef: RefObject<PendingMap>;
  readonly scopeRef: RefObject<PreviewScopeRef>;
}

interface TokenPreview {
  readonly errors: ErrorMap;
  readonly goodRef: RefObject<PendingMap>;
  readonly mergeErrors: (extra: ErrorMap) => void;
  readonly resetErrors: () => void;
  readonly schedule: () => void;
  readonly stop: () => void;
}

const useTokenPreview = (input: TokenPreviewInput): TokenPreview => {
  const { broadcastCss, pendingRef, scopeRef } = input;
  const [errors, setErrors] = useState<ErrorMap>({});
  const goodRef = useRef<PendingMap>({});
  const seqRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSentRef = useRef(0);

  const stop = useCallback((): void => {
    seqRef.current += 1;

    if (timerRef.current !== null) {
      globalThis.clearTimeout(timerRef.current);
    }

    timerRef.current = null;
  }, []);

  const run = useCallback(async (): Promise<void> => {
    timerRef.current = null;
    lastSentRef.current = Date.now();
    seqRef.current += 1;
    const mine = seqRef.current;
    const { directionId, projectId } = scopeRef.current;
    const changes = toChanges(pendingRef.current);

    if (changes.length === 0 || !directionId) {
      setErrors({});
      broadcastCss("");

      return;
    }

    const good = goodRef.current;

    const outcome = await previewWithFallback(
      { directionId, good, projectId },
      changes
    );

    if (mine !== seqRef.current) {
      return;
    }

    setErrors(outcome.errors);

    if (outcome.css !== null) {
      broadcastCss(outcome.css);
    }
  }, [broadcastCss, pendingRef, scopeRef]);

  const schedule = useCallback((): void => {
    if (timerRef.current !== null) {
      return;
    }

    const wait = Math.max(
      0,
      PREVIEW_THROTTLE_MS - (Date.now() - lastSentRef.current)
    );

    timerRef.current = globalThis.setTimeout(() => {
      void run();
    }, wait);
  }, [run]);

  const mergeErrors = useCallback((extra: ErrorMap): void => {
    setErrors((previous) => ({ ...previous, ...extra }));
  }, []);

  const resetErrors = useCallback((): void => {
    goodRef.current = {};
    setErrors({});
  }, []);

  return { errors, goodRef, mergeErrors, resetErrors, schedule, stop };
};

export { useTokenPreview };

export type { PreviewScopeRef, TokenPreview };
