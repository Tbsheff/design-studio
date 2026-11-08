import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

interface PlayBarProps {
  readonly title: string;
  readonly hint: string;
  readonly isBackDisabled: boolean;
  readonly onBack: () => void;
  readonly onRestart: () => void;
  readonly onExit: () => void;
}

const PlayBar = ({
  title,
  hint,
  isBackDisabled,
  onBack,
  onRestart,
  onExit,
}: PlayBarProps): ReactElement => (
  <div className="play-bar">
    <button
      type="button"
      className="icon-btn small"
      aria-label={copy.back}
      data-tip={copy.back7}
      disabled={isBackDisabled}
      onClick={onBack}
    >
      <Icon name="arrowLeft" size={14} />
    </button>
    <span className="play-title" data-testid="play-title">
      {title}
    </span>
    <span className="play-hint">{hint}</span>
    <button type="button" className="btn small ghost" onClick={onRestart}>
      <Icon name="restore" size={12} />
      {copy.restart} <kbd>{copy.keyLetterR}</kbd>
    </button>
    <button type="button" className="btn small ghost" onClick={onExit}>
      <Icon name="close" size={12} />
      {copy.exit} <kbd>{copy.esc}</kbd>
    </button>
  </div>
);

export { PlayBar };
