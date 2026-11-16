import { Icon } from "@design-studio/ui";
import { useMemo } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { stopPointer, toAskStyle } from "./selection-prompt-model.js";
import type { PromptBounds, PromptRect } from "./selection-prompt-model.js";

const ASK_ICON = 12;

interface SelectionPromptAskProps {
  readonly bounds: PromptBounds;
  readonly onOpen: () => void;
  readonly rect: PromptRect;
  readonly zoom: number;
}

const SelectionPromptAsk = ({
  bounds,
  onOpen,
  rect,
  zoom,
}: SelectionPromptAskProps): ReactElement => {
  const style = useMemo(
    () => toAskStyle(rect, zoom, bounds),
    [rect, zoom, bounds]
  );

  return (
    <button
      type="button"
      className="selection-prompt-ask"
      style={style}
      aria-label={copy.selectionPrompt.askTip}
      data-tip={copy.selectionPrompt.askTip}
      onPointerDown={stopPointer}
      onClick={onOpen}
    >
      <Icon name="sparkle" size={ASK_ICON} />
      <span>{copy.selectionPrompt.ask}</span>
    </button>
  );
};

export { SelectionPromptAsk };
