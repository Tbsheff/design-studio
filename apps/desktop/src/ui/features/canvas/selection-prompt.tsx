import type { SelectionContext } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { SelectionPromptAsk } from "./selection-prompt-ask.js";
import { SelectionPromptBox } from "./selection-prompt-box.js";
import type { PromptBounds } from "./selection-prompt-model.js";
import { SelectionPromptStatus } from "./selection-prompt-status.js";
import { useSelectionPrompt } from "./use-selection-prompt.js";

interface SelectionPromptProps {
  readonly bounds: PromptBounds;
  readonly selection: readonly SelectionContext[];
  readonly zoom: number;
}

const SelectionPrompt = ({
  bounds,
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
  } = useSelectionPrompt(selection, zoom, bounds);

  return (
    <div className="selection-prompt-layer">
      {rect && phase.kind === "closed" && !isRunning && (
        <SelectionPromptAsk
          bounds={bounds}
          rect={rect}
          zoom={zoom}
          onOpen={onOpen}
        />
      )}
      {rect && phase.kind === "open" && (
        <SelectionPromptBox
          count={selection.length}
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
