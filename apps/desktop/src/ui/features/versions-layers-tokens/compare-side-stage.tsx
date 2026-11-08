import type { Version } from "@design-studio/contracts";
import { useCallback, useMemo } from "react";
import type { ReactNode } from "react";

import type { BoardProps } from "./compare-board-types.js";
import { CompareFrame } from "./compare-frame.js";

interface CompareSideStageProps {
  readonly board: BoardProps;
  readonly title: string;
  readonly version: Version;
}

const CompareSideStage = ({
  board,
  title,
  version,
}: CompareSideStageProps): ReactNode => {
  const { onError, scale, viewport } = board;

  const boardStyle = useMemo(
    () => ({
      height: viewport.height * scale,
      width: viewport.width * scale,
    }),
    [scale, viewport.height, viewport.width]
  );

  const handleError = useCallback(
    (message: string): void => {
      onError(message);
    },
    [onError]
  );

  return (
    <div className="compare-stage">
      <div className="compare-board" style={boardStyle}>
        <CompareFrame
          projectId={board.projectId}
          version={version}
          title={title}
          kind={board.kind}
          viewport={viewport}
          scale={scale}
          onError={handleError}
        />
      </div>
    </div>
  );
};

export { CompareSideStage };
