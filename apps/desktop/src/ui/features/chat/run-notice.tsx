import type { ReactElement } from "react";

import { BudgetNotice } from "./budget-notice.js";
import { CONTEXT_WARN } from "./chat-parts-model.js";
import { ContextNotice } from "./context-notice.js";
import { contextShare } from "./context-share-model.js";
import type { RunView } from "./run-state-model.js";

const RunNotice = ({
  run,
  latest,
  onRetry,
}: {
  run: RunView;
  latest: boolean;
  onRetry: (() => void) | null;
}): ReactElement | null => {
  if (run.status === "budget_exceeded") {
    return <BudgetNotice run={run} latest={latest} onRetry={onRetry} />;
  }

  if (!latest || run.status === "running" || run.contextTokens === null) {
    return null;
  }

  const share = contextShare(run.contextTokens, run.summary?.model ?? "");

  if (share < CONTEXT_WARN) {
    return null;
  }

  return <ContextNotice share={share} />;
};

export { RunNotice };
