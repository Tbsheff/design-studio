import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

interface ShareViewerHeadProps {
  readonly title: string;
  readonly isLive: boolean;
  readonly isCommentsOpen: boolean;
  readonly onPlay: () => void;
  readonly onComments: () => void;
}

const toCommentsClass = (isOpen: boolean): string => {
  if (isOpen) {
    return "btn ghost is-on";
  }

  return "btn ghost";
};

const ShareViewerHead = ({
  isCommentsOpen,
  isLive,
  onComments,
  onPlay,
  title,
}: ShareViewerHeadProps): ReactElement => (
  <header className="share-head">
    <h1 className="share-title">{title}</h1>
    <span className="share-badge">{copy.readOnly}</span>
    {isLive && <span className="share-badge is-live">{copy.live}</span>}
    <span className="share-spacer" />
    <button
      type="button"
      className={toCommentsClass(isCommentsOpen)}
      aria-pressed={isCommentsOpen}
      onClick={onComments}
    >
      <Icon name="chat" />
      {copy.comment}
    </button>
    <button
      type="button"
      className="btn primary"
      data-tip={copy.playTip}
      data-testid="share-play"
      onClick={onPlay}
    >
      <Icon name="play" />
      {copy.play}
    </button>
  </header>
);

export { ShareViewerHead };
