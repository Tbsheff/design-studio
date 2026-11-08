import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { ThreadIconButton } from "./thread-icon-button.js";

const ThreadFixButton = ({
  onFix,
}: {
  onFix: (() => void) | null;
}): ReactElement | null => {
  if (!onFix) {
    return null;
  }

  return (
    <ThreadIconButton
      icon="sparkle"
      isDanger={false}
      label={copy.fix}
      onClick={onFix}
      size={14}
      testId="comment-fix-open"
      tip={copy.fixTip}
    />
  );
};

export { ThreadFixButton };
