import type { SelectionContext } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { SelectionPromptAsk } from "./selection-prompt-ask.js";
import { SelectionPromptBox } from "./selection-prompt-box.js";
import { SelectionPromptStatus } from "./selection-prompt-status.js";
import { useSelectionPrompt } from "./use-selection-prompt.js";

interface SelectionPromptProps {
  readonly selection: readonly SelectionContext[];
  readonly zoom: number;
}

const SelectionPrompt = ({
  selection,
  zoom,
}: SelectionPromptProps): ReactElement => {
  const {
    elapsed,
    isRunning,
    label,
    onChat,
    onClose,
    onOpen,
    onSubmit,
    onText,
    phase,
    place,
    placement,
    rect,
    text,
  } = useSelectionPrompt(selection, zoom);

  return (
    <div className="selection-prompt-layer">
      {rect && phase.kind === "closed" && !isRunning && (
        <SelectionPromptAsk rect={rect} zoom={zoom} onOpen={onOpen} />
      )}
      {rect && phase.kind === "open" && (
        <SelectionPromptBox
          isRunning={isRunning}
          label={label}
          place={place}
          placement={placement}
          rect={rect}
          text={text}
          zoom={zoom}
          onChat={onChat}
          onClose={onClose}
          onSubmit={onSubmit}
          onText={onText}
        />
      )}
      {rect && phase.kind === "working" && (
        <SelectionPromptStatus
          elapsed={elapsed}
          label={phase.label}
          place={place}
          placement={placement}
          rect={rect}
          zoom={zoom}
          onClose={onClose}
        />
      )}
    </div>
  );
};

export { SelectionPrompt };
