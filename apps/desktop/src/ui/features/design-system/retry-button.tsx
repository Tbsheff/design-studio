import type { ReactElement } from "react";

import { COPY } from "./copy.js";

const RetryButton = ({
  onRetry,
}: {
  onRetry: (() => void) | null;
}): ReactElement | null => {
  if (!onRetry) {
    return null;
  }

  return (
    <button type="button" className="btn small" onClick={onRetry}>
      {COPY.textTryAgain}
    </button>
  );
};

export { RetryButton };
