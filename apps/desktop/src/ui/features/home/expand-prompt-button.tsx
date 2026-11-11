import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { ExpandPrompt } from "./use-expand-prompt.js";

const ICON_SIZE = 15;

const ExpandPromptButton = ({
  expand,
  isEmpty,
}: {
  readonly expand: ExpandPrompt;
  readonly isEmpty: boolean;
}): ReactElement | null => {
  const { expand: expandNow, undo } = expand;

  if (expand.canUndo) {
    return (
      <button
        type="button"
        className="icon-btn home-expand"
        aria-label={copy.undoExpandPromptTip}
        data-tip={copy.undoExpandPromptTip}
        data-tip-side="top"
        onClick={undo}
      >
        <Icon name="undo" size={ICON_SIZE} />
      </button>
    );
  }

  if (isEmpty) {
    return null;
  }

  return (
    <button
      type="button"
      className="icon-btn home-expand"
      disabled={expand.isExpanding}
      aria-busy={expand.isExpanding}
      aria-label={copy.expandPrompt}
      data-tip={expand.error ?? copy.expandPromptTip}
      data-tip-side="top"
      onClick={expandNow}
    >
      <Icon name="sparkle" size={ICON_SIZE} />
    </button>
  );
};

export { ExpandPromptButton };
