import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { toPageLabel } from "./run-context-model.js";
import type { RunCanvasChip } from "./use-run-canvas.js";

const toDetail = (chip: RunCanvasChip): string => {
  if (chip.state) {
    return ` (${chip.state})`;
  }

  return "";
};

const RunContextText = ({ chip }: { chip: RunCanvasChip }): ReactElement => {
  if (chip.element) {
    return (
      <span className="chip-text min-w-0 truncate">
        {copy.onElement}
        <span className="font-mono text-foreground">{chip.element}</span>
        {toDetail(chip)}
      </span>
    );
  }

  return (
    <span className="chip-text min-w-0 truncate">
      {toPageLabel(chip.page)}
      {toDetail(chip)}
    </span>
  );
};

export { RunContextText };
