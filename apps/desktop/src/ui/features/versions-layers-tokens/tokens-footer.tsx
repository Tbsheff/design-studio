import { Icon } from "@design-studio/ui";
import type { ReactNode } from "react";

import { TokensFooterBar } from "./tokens-footer-bar.js";
import type { TokenDraft } from "./use-token-draft.js";

const ALERT_SIZE = 13;

interface TokensFooterProps {
  readonly draft: TokenDraft;
}

const TokensFooter = ({ draft }: TokensFooterProps): ReactNode => {
  if (draft.count === 0 && !draft.commitError) {
    return null;
  }

  return (
    <div className="tkp-footer">
      {draft.commitError && (
        <p className="ins-error tkp-commit-error" role="alert">
          <Icon name="alert" size={ALERT_SIZE} />
          {draft.commitError}
        </p>
      )}
      {draft.count > 0 && <TokensFooterBar draft={draft} />}
    </div>
  );
};

export { TokensFooter };
