import type { CanvasSection } from "@design-studio/contracts/canvas-file";
import type { ReactElement } from "react";

import { stateCheckCopy } from "./copy.js";
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

  return (
    <span className="canvas-state-check">
      <span className="canvas-state-check-line">{check.line}</span>
      {check.prompt !== null && (
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
