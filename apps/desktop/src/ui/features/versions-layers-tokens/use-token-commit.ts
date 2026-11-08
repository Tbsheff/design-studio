import type { TokenChange, Version } from "@design-studio/contracts";
import { useCallback, useTransition } from "react";
import type { RefObject } from "react";

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
  readonly scopeRef: RefObject<CommitScope>;
  readonly setCommitError: (message: string | null) => void;
  readonly stopPreview: () => void;
}

interface TokenCommit {
  readonly commit: () => void;
  readonly isCommitting: boolean;
}

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

  return { commit, isCommitting };
};

export { useTokenCommit };

export type { CommitScope, TokenCommit };
