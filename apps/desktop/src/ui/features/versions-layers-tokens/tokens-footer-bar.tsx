import { useCallback } from "react";
import type { ReactNode } from "react";

import { COPY } from "./copy.js";
import { toChangeCount } from "./tokens-panel-model.js";
import type { TokenDraft } from "./use-token-draft.js";

interface TokensFooterBarProps {
  readonly draft: TokenDraft;
}

const TokensFooterBar = ({ draft }: TokensFooterBarProps): ReactNode => {
  const { commit, discard: handleDiscard } = draft;

  const handleCommit = useCallback((): void => {
    void commit();
  }, [commit]);

  let commitLabel: string = COPY.panelCommit;

  if (draft.committing) {
    commitLabel = COPY.panelCommitting;
  }

  return (
    <div className="tkp-footer-bar">
      <span className="tkp-count" aria-live="polite">
        {toChangeCount(draft.count)}
      </span>
      <button
        type="button"
        className="btn small ghost"
        disabled={draft.committing}
        onClick={handleDiscard}
      >
        {COPY.panelDiscard}
      </button>
      <button
        type="button"
        className="btn small primary"
        disabled={draft.committing}
        onClick={handleCommit}
      >
        {commitLabel}
      </button>
    </div>
  );
};

export { TokensFooterBar };
