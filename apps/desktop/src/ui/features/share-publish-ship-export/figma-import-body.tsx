import type { FigmaFrameInfo } from "@design-studio/contracts/figma-nodes";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { FigmaFailureNote } from "./figma-failure-note.js";
import { FigmaFrameField } from "./figma-frame-field.js";
import { FigmaJsonFallback } from "./figma-json-fallback.js";
import { FigmaPositionField } from "./figma-position-field.js";
import { FigmaSummary } from "./figma-summary.js";
import type { FigmaImportFlow } from "./use-figma-import.js";

const NO_FRAMES: readonly FigmaFrameInfo[] = [];

interface Props {
  readonly canNest: boolean;
  readonly flow: FigmaImportFlow;
}

const FigmaImportBody = ({ canNest, flow }: Props): ReactElement => {
  const { base, failure, isLoading, nodeId, preview } = flow;
  const frames = preview?.frames ?? NO_FRAMES;
  const chosen = nodeId || preview?.frame.id || "";

  return (
    <div className="modal-body fgi-form">
      <FigmaFrameField
        chosen={chosen}
        frames={frames}
        onChange={flow.handleNodeChange}
      />
      <FigmaPositionField
        canNest={canNest}
        onChange={flow.handlePositionChange}
        position={flow.position}
      />
      {preview && <FigmaSummary preview={preview} />}
      {isLoading && !preview && !failure && (
        <div className="fgi-loading">{copy.readingTheFigmaFrame}</div>
      )}
      {failure && <FigmaFailureNote failure={failure} />}
      <FigmaJsonFallback
        base={base}
        failure={failure}
        onUse={flow.handleUseNodes}
      />
    </div>
  );
};

export { FigmaImportBody };
