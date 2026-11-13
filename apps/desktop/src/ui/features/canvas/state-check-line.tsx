import type { CanvasSection } from "@design-studio/contracts/canvas-file";
import type { ReactElement } from "react";

import { stateCheckCopy, stateRunCopy } from "./copy.js";
import { toEndedLine, toRunningLine } from "./state-run-model.js";
import { useStateCheck } from "./use-state-check.js";

interface StateCheckLineProps {
  readonly headVersionId: string | null;
  readonly projectId: string;
  readonly section: CanvasSection;
}

const StateCheckLine = ({
  headVersionId,
  projectId,
  section,
}: StateCheckLineProps): ReactElement | null => {
  const check = useStateCheck({ headVersionId, projectId, section });

  if (!check.isShown) {
    return null;
  }

  const { phase } = check;

  if (phase.kind === "running") {
    return (
      <span className="canvas-state-check">
        <span className="canvas-state-check-line">{toRunningLine(phase)}</span>
        <button
          type="button"
          className="canvas-state-check-design"
          data-tip={stateRunCopy.stopTip}
          onClick={check.handleStop}
        >
          {stateRunCopy.stop}
        </button>
      </span>
    );
  }

  return (
    <span className="canvas-state-check">
      <span className="canvas-state-check-line">{check.line}</span>
      {phase.kind === "ended" && (
        <span className="canvas-state-check-line">{toEndedLine(phase)}</span>
      )}
      {check.plan !== null && (
        <button
          type="button"
          className="canvas-state-check-design"
          data-tip={stateCheckCopy.designTip}
          disabled={check.isRunning}
          onClick={check.handleDesign}
        >
          {stateCheckCopy.design}
        </button>
      )}
    </span>
  );
};

export { StateCheckLine };
