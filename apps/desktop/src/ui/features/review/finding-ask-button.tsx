import type { ReviewFinding } from "@design-studio/contracts/review";
import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { pick } from "./pick.js";

interface FindingAskButtonProps {
  readonly finding: ReviewFinding;
  readonly canAsk: boolean;
  readonly onAsk: (finding: ReviewFinding) => void;
}

const FindingAskButton = ({
  canAsk,
  finding,
  onAsk,
}: FindingAskButtonProps): ReactElement => {
  const askAgent = useCallback((): void => {
    onAsk(finding);
  }, [finding, onAsk]);

  return (
    <button
      type="button"
      className="btn small"
      disabled={!canAsk}
      data-tip={pick(canAsk, copy.askTip, copy.chatUnavailable)}
      data-tip-align="end"
      onClick={askAgent}
    >
      <Icon name="chat" size={12} />
      {copy.askAgent}
    </button>
  );
};

export { FindingAskButton };
