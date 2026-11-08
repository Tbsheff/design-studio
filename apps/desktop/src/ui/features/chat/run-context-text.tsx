import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { RunCanvasChip } from "./use-run-canvas.js";

const toDetail = (chip: RunCanvasChip): string => {
  let detail = "";

  if (chip.state) {
    detail += ` (${chip.state})`;
  }

  if (chip.element) {
    detail += ` · ${chip.element}`;
  }

  return detail;
};

const RunContextText = ({ chip }: { chip: RunCanvasChip }): ReactElement => (
  <span className="chip-text min-w-0 truncate">
    {copy.onPage}
    <span className="font-mono text-foreground">{chip.page}</span>
    {toDetail(chip)}
  </span>
);

export { RunContextText };
