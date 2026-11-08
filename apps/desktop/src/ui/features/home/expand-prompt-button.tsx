import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { ExpandPrompt } from "./use-expand-prompt.js";

const ICON_SIZE = 14;

const ExpandPromptButton = ({
  expand,
  isEmpty,
}: {
  readonly expand: ExpandPrompt;
  readonly isEmpty: boolean;
}): ReactElement => {
  const { expand: expandNow, undo } = expand;

  if (expand.canUndo) {
    return (
      <button
        type="button"
        className="home-expand"
        data-tip={copy.undoExpandPromptTip}
        onClick={undo}
      >
        <Icon name="undo" size={ICON_SIZE} />
        <span>{copy.undoExpandPrompt}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      className="home-expand"
      disabled={isEmpty || expand.isExpanding}
      aria-busy={expand.isExpanding}
      data-tip={expand.error ?? copy.expandPromptTip}
      onClick={expandNow}
    >
      <Icon name="sparkle" size={ICON_SIZE} />
      <span>{copy.expandPrompt}</span>
    </button>
  );
};

export { ExpandPromptButton };
