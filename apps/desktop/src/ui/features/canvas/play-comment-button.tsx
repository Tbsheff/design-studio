import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { protoCopy } from "./proto-copy.js";

interface PlayCommentButtonProps {
  readonly isOn: boolean;
  readonly onToggle: () => void;
}

const toLabel = (isOn: boolean): string => {
  if (isOn) {
    return protoCopy.commentOff;
  }

  return protoCopy.comment;
};

const PlayCommentButton = ({
  isOn,
  onToggle,
}: PlayCommentButtonProps): ReactElement => (
  <button
    type="button"
    className="btn small play-comment-btn"
    aria-pressed={isOn}
    data-tip={protoCopy.commentTip}
    data-testid="play-comment-toggle"
    onClick={onToggle}
  >
    <Icon name="comment" size={12} />
    {toLabel(isOn)} <kbd>{protoCopy.commentKey}</kbd>
  </button>
);

export { PlayCommentButton };
