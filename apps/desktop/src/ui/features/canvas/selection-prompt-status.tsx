import { Icon } from "@design-studio/ui";
import { useMemo } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { stopPointer, toBoxStyle } from "./selection-prompt-model.js";
import type { PromptPlacement, PromptRect } from "./selection-prompt-model.js";

const CLOSE_ICON = 12;

interface SelectionPromptStatusProps {
  readonly elapsed: number;
  readonly label: string;
  readonly onClose: () => void;
  readonly place: (node: HTMLElement | null) => void;
  readonly placement: PromptPlacement;
  readonly rect: PromptRect;
  readonly zoom: number;
}

const SelectionPromptStatus = ({
  elapsed,
  label,
  onClose,
  place,
  placement,
  rect,
  zoom,
}: SelectionPromptStatusProps): ReactElement => {
  const style = useMemo(
    () => toBoxStyle(rect, zoom, placement),
    [rect, zoom, placement]
  );

  return (
    <output
      ref={place}
      className="selection-prompt selection-prompt-status"
      style={style}
      onPointerDown={stopPointer}
    >
      <span className="selection-prompt-spinner" aria-hidden="true" />
      <span className="selection-prompt-status-text">
        {copy.selectionPrompt.workingOn}
        {label}
        {copy.selectionPrompt.separator}
        {elapsed}
        {copy.selectionPrompt.seconds}
      </span>
      <button
        type="button"
        className="selection-prompt-link"
        aria-label={copy.selectionPrompt.close}
        data-tip={copy.selectionPrompt.close}
        onClick={onClose}
      >
        <Icon name="close" size={CLOSE_ICON} />
      </button>
    </output>
  );
};

export { SelectionPromptStatus };
