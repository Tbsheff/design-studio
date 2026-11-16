import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { isRootPage } from "./run-context-model.js";
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

  if (isRootPage(chip.page)) {
    return (
      <span className="chip-text min-w-0 truncate">
        {copy.onHomePage}
        {toDetail(chip)}
      </span>
    );
  }

  return (
    <span className="chip-text min-w-0 truncate">
      {copy.onPage}
      <span className="font-mono text-foreground">{chip.page}</span>
      {toDetail(chip)}
    </span>
  );
};

export { RunContextText };
