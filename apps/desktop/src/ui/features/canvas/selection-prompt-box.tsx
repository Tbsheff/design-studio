import { useCallback, useMemo } from "react";
import type { KeyboardEvent, ReactElement } from "react";

import { SelectionPromptFoot } from "./selection-prompt-foot.js";
import {
  stopPointer,
  stopWheel,
  toBoxStyle,
} from "./selection-prompt-model.js";
import type { PromptPlacement, PromptRect } from "./selection-prompt-model.js";
import { SelectionPromptRow } from "./selection-prompt-row.js";

interface SelectionPromptBoxProps {
  readonly count: number;
  readonly isRunning: boolean;
  readonly label: string;
  readonly onChat: () => void;
  readonly onClose: () => void;
  readonly onSubmit: () => void;
  readonly onText: (text: string) => void;
  readonly place: (node: HTMLElement | null) => void;
  readonly placement: PromptPlacement;
  readonly rect: PromptRect;
  readonly text: string;
  readonly zoom: number;
}

const SelectionPromptBox = ({
  count,
  isRunning,
  label,
  onChat,
  onClose,
  onSubmit,
  onText,
  place,
  placement,
  rect,
  text,
  zoom,
}: SelectionPromptBoxProps): ReactElement => {
  const style = useMemo(
    () => toBoxStyle(rect, zoom, placement),
    [rect, zoom, placement]
  );

  const closeOnEscape = useCallback(
    (event: KeyboardEvent<HTMLDivElement>): void => {
      event.stopPropagation();

      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    },
    [onClose]
  );

  return (
    <div
      ref={place}
      className="selection-prompt"
      role="presentation"
      style={style}
      onPointerDown={stopPointer}
      onWheel={stopWheel}
      onKeyDown={closeOnEscape}
    >
      <SelectionPromptRow
        isRunning={isRunning}
        label={label}
        text={text}
        onSubmit={onSubmit}
        onText={onText}
      />
      <SelectionPromptFoot count={count} onChat={onChat} onClose={onClose} />
    </div>
  );
};

export { SelectionPromptBox };
