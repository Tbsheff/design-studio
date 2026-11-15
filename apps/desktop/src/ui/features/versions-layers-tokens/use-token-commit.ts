import type { TokenChange, Version } from "@design-studio/contracts";
import { useCallback, useTransition } from "react";
import type { RefObject, TransitionStartFunction } from "react";

import { api, errorText } from "../../api.js";
import { toCommitMessage } from "./token-commit-message.js";
import { errorPaths, toChanges } from "./token-draft.js";
import type { PendingMap } from "./token-draft.js";
import type { ErrorMap } from "./token-preview-request.js";

type CommittedState = Awaited<ReturnType<typeof api.updateTokens>>["state"];

interface CommitScope {
  readonly directionId: string | null;
  readonly onCommitted: (version: Version) => void;
  readonly projectId: string;
  readonly tokens: { readonly replace: (state: CommittedState) => void } | null;
}

interface TokenCommitInput {
  readonly clearDraft: () => void;
  readonly holdCss: () => void;
  readonly mergeErrors: (extra: ErrorMap) => void;
  readonly pendingRef: RefObject<PendingMap>;
  readonly revert: (path: string) => void;
  readonly scopeRef: RefObject<CommitScope>;
  readonly setCommitError: (message: string | null) => void;
  readonly stopPreview: () => void;
}

interface TokenCommit {
  readonly commit: () => void;
  readonly commitOne: (path: string) => void;
  readonly isCommitting: boolean;
}

const useTokenCommitOne = (
  input: TokenCommitInput,
  startTransition: TransitionStartFunction
): ((path: string) => void) => {
  const { clearDraft, holdCss, mergeErrors, pendingRef, scopeRef } = input;
  const { revert, setCommitError } = input;

  const clearOne = useCallback(
    (path: string): void => {
      const rest = Object.keys(pendingRef.current).filter(
        (key) => key !== path
      );

      if (rest.length === 0) {
        clearDraft();
        holdCss();

        return;
      }

      revert(path);
    },
    [clearDraft, holdCss, pendingRef, revert]
  );

  const sendOne = useCallback(
    async (change: TokenChange): Promise<void> => {
      const { directionId, onCommitted, projectId, tokens } = scopeRef.current;

      try {
        const result = await api.updateTokens(projectId, directionId ?? "", [
          change,
        ]);

        tokens?.replace(result.state);
        clearOne(change.path);
        onCommitted(result.version);
      } catch (error) {
        setCommitError(toCommitMessage(error as Error));
        mergeErrors(errorPaths([errorText(error as Error)], [change]));
      }
    },
    [clearOne, mergeErrors, scopeRef, setCommitError]
  );

  const commitOne = useCallback(
    (path: string): void => {
      const change =
        toChanges(pendingRef.current).find((item) => item.path === path) ??
        null;

      if (!scopeRef.current.directionId || change === null) {
        return;
      }

      setCommitError(null);

      startTransition(async () => {
        await sendOne(change);
      });
    },
    [pendingRef, scopeRef, sendOne, setCommitError, startTransition]
  );

  return commitOne;
};

const useTokenCommit = (input: TokenCommitInput): TokenCommit => {
  const { clearDraft, holdCss, mergeErrors, pendingRef, scopeRef } = input;
  const { setCommitError, stopPreview } = input;
  const [isCommitting, startTransition] = useTransition();

  const send = useCallback(
    async (changes: TokenChange[]): Promise<void> => {
      const { directionId, onCommitted, projectId, tokens } = scopeRef.current;

      try {
        const result = await api.updateTokens(
          projectId,
          directionId ?? "",
          changes
        );

        tokens?.replace(result.state);
        clearDraft();
        holdCss();
        onCommitted(result.version);
      } catch (error) {
        setCommitError(toCommitMessage(error as Error));
        mergeErrors(errorPaths([errorText(error as Error)], changes));
      }
    },
    [clearDraft, holdCss, mergeErrors, scopeRef, setCommitError]
  );

  const commit = useCallback((): void => {
    const changes = toChanges(pendingRef.current);

    if (!scopeRef.current.directionId || changes.length === 0) {
      return;
    }

    stopPreview();
    setCommitError(null);

    startTransition(async () => {
      await send(changes);
    });
  }, [pendingRef, scopeRef, send, setCommitError, stopPreview]);

  const commitOne = useTokenCommitOne(input, startTransition);

  return { commit, commitOne, isCommitting };
};

export { useTokenCommit };

export type { CommitScope, TokenCommit };
