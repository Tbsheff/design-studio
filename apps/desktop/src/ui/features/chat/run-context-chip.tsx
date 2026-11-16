import type { SelectionContext } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { RunContextPill } from "./run-context-pill.js";
import type { RunCanvasChip } from "./use-run-canvas.js";

const RunContextChip = ({
  chip,
  selection,
}: {
  chip: RunCanvasChip | null | undefined;
  selection: readonly SelectionContext[];
}): ReactElement | null => {
  if (!chip || selection.length > 0) {
    return null;
  }

  let state = "";

  if (chip.state) {
    state = `, ${chip.state}`;
  }

  const tip = `The agent works on frame ${chip.frameId} (${chip.page}${state}) and checks it there. Remove to send without it.`;

  return (
    <div className="chips run-context flex flex-wrap gap-1 px-2 pt-2">
      <RunContextPill chip={chip} tip={tip} />
    </div>
  );
};

export { RunContextChip };
