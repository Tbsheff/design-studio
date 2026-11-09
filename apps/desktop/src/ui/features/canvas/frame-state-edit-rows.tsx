import type { FrameStatesView } from "@design-studio/contracts/frame-state";
import type { ReactElement } from "react";

import { FrameStateClockRow } from "./frame-state-clock-row.js";
import { KeepOpenSection } from "./keep-open-section.js";

const FrameStateEditRows = ({
  chosen,
  frameId,
  projectId,
  run,
  view,
}: {
  chosen: string;
  frameId: string;
  projectId: string;
  run: (task: Promise<unknown>) => Promise<void>;
  view: FrameStatesView;
}): ReactElement => (
  <>
    <KeepOpenSection
      chosen={chosen}
      frameId={frameId}
      projectId={projectId}
      run={run}
      view={view}
    />
    <FrameStateClockRow
      def={view.states.find((state) => state.id === chosen) ?? null}
      frameId={frameId}
      projectId={projectId}
      run={run}
    />
  </>
);

export { FrameStateEditRows };
