import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";
import { startTransition, useCallback } from "react";

import { copy } from "./copy.js";
import { toChangeCount, toCommitLabel } from "./tweaks-model.js";
import type { TweaksDraft } from "./use-tweaks.js";

const TweaksFooter = ({
  draft,
}: {
  readonly draft: TweaksDraft;
}): ReactElement | null => {
  const { commit, commitError, count, discard, isCommitting } = draft;

  const runCommit = useCallback(() => {
    startTransition(async () => {
      await commit();
    });
  }, [commit]);

  if (count === 0 && !commitError) {
    return null;
  }

  return (
    <div className="twk-footer">
      {commitError && (
        <p className="twk-error twk-commit-error" role="alert">
          <Icon name="alert" size={13} />
          {commitError}
        </p>
      )}
      {count > 0 && (
        <div className="twk-footer-bar">
          <span className="twk-count" aria-live="polite">
            {toChangeCount(count)}
          </span>
          <button
            type="button"
            className="btn small ghost"
            disabled={isCommitting}
            onClick={discard}
          >
            {copy.discard}
          </button>
          <button
            type="button"
            className="btn small primary"
            disabled={isCommitting}
            onClick={runCommit}
          >
            {toCommitLabel(isCommitting)}
          </button>
        </div>
      )}
    </div>
  );
};

export { TweaksFooter };
