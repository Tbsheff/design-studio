import type { CompiledTokenEntry, Version } from "@design-studio/contracts";
import { useCallback, useMemo, useState } from "react";

import {
  broadcastTheme,
  broadcastTokenCss,
  holdTokenCssUntilReload,
  useCanvasTheme,
} from "../design-system/token-frames.js";
import type { ThemeChoice } from "../design-system/token-frames.js";
import type { DesignTokens } from "../design-system/use-design-system-state.js";
import { AGENT_BUSY_MESSAGE } from "./token-commit-message.js";
import { overlayTokens } from "./token-draft.js";
import type { PendingMap, TokenField } from "./token-draft.js";
import type { ErrorMap } from "./token-preview-request.js";
import { useDraftClear } from "./use-draft-clear.js";
import { useLatestRef } from "./use-latest-ref.js";
import { useTokenCommit } from "./use-token-commit.js";
import { useTokenEdits } from "./use-token-edits.js";
import { useTokenLeave } from "./use-token-leave.js";
import { useTokenPreview } from "./use-token-preview.js";

interface Options {
  projectId: string;
  directionId: string | null;
  tokens: DesignTokens | null;
  onCommitted: (version: Version) => void;
}

interface TokenDraft {
  readonly commit: () => void;
  readonly commitError: string | null;
  readonly commitOne: (path: string) => void;
  readonly committing: boolean;
  readonly confirmLeave: () => boolean;
  readonly count: number;
  readonly discard: () => void;
  readonly edit: (
    entry: CompiledTokenEntry,
    field: TokenField,
    value: string | null
  ) => void;
  readonly effective: DesignTokens | null;
  readonly errors: ErrorMap;
  readonly pending: PendingMap;
  readonly revert: (path: string) => void;
  readonly setTheme: (next: ThemeChoice) => void;
  readonly theme: ThemeChoice;
  readonly undoLast: () => void;
}

const setTheme = (next: ThemeChoice): void => {
  broadcastTheme(next);
};

const confirmDiscard = (count: number): boolean => {
  let noun = "changes";

  if (count === 1) {
    noun = "change";
  }

  const { confirm: askUser } = globalThis;

  return askUser(`Discard ${count} token ${noun}?`);
};

const endTheme = (): void => {
  broadcastTheme(null);
};

const useTokenDraft = (options: Options): TokenDraft => {
  const [pending, setPending] = useState<PendingMap>({});
  const [commitError, setCommitError] = useState<string | null>(null);
  const theme = useCanvasTheme();
  const scope = `${options.projectId}:${options.directionId}`;
  const scopeRef = useLatestRef(options);
  const pendingRef = useLatestRef(pending);
  const broadcastCss = broadcastTokenCss;
  const holdCss = holdTokenCssUntilReload;
  const onScopeEnd = endTheme;
  const preview = useTokenPreview({ broadcastCss, pendingRef, scopeRef });
  const { errors, mergeErrors, resetErrors, schedule, stop } = preview;

  const apply = useCallback(
    (next: PendingMap): void => {
      pendingRef.current = next;
      setPending(next);
      setCommitError(null);
      schedule();
    },
    [pendingRef, schedule]
  );

  const { edit, revert, undoLast, clearHistory } = useTokenEdits({
    apply,
    pendingRef,
    scopeRef,
  });

  const { clearDraft, reset } = useDraftClear({
    broadcastCss,
    clearHistory,
    onScopeEnd,
    pendingRef,
    resetErrors,
    scope,
    setCommitError,
    setPending,
    stop,
  });

  const {
    commit,
    commitOne,
    isCommitting: committing,
  } = useTokenCommit({
    clearDraft,
    holdCss,
    mergeErrors,
    pendingRef,
    revert,
    scopeRef,
    setCommitError,
    stopPreview: stop,
  });

  const confirmLeave = useTokenLeave(pendingRef, reset, confirmDiscard);
  const discard = reset;
  const count = Object.keys(pending).length;

  const effective = useMemo(
    () => overlayTokens(options.tokens, pending),
    [options.tokens, pending]
  );

  return {
    commit,
    commitError,
    commitOne,
    committing,
    confirmLeave,
    count,
    discard,
    edit,
    effective,
    errors,
    pending,
    revert,
    setTheme,
    theme,
    undoLast,
  };
};

export { AGENT_BUSY_MESSAGE, useTokenDraft };

export type { TokenDraft };
