import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

interface TweaksPromptActionsProps {
  readonly canSend: boolean;
  readonly hasText: boolean;
  readonly isRunning: boolean;
  readonly onSend: () => void;
}

const TweaksPromptActions = ({
  canSend,
  hasText,
  isRunning,
  onSend,
}: TweaksPromptActionsProps): ReactElement => (
  <>
    {!hasText && (
      <button
        type="button"
        className="btn small ghost ins-tweaks-auto"
        disabled={!canSend || isRunning}
        data-tip={copy.claudePicksTheControls}
        onClick={onSend}
      >
        {copy.letClaudeChoose}
      </button>
    )}
    <button
      type="button"
      className="icon-btn small send"
      aria-label={copy.addTweaksPanel}
      disabled={!canSend || isRunning || !hasText}
      onClick={onSend}
    >
      <Icon name="arrowUp" size={14} />
    </button>
  </>
);

export { TweaksPromptActions };
