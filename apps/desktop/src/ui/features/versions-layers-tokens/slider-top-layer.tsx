import { useMemo } from "react";
import type { ReactNode } from "react";

import type { BoardProps } from "./compare-board-types.js";
import { CompareFrame } from "./compare-frame.js";

interface SliderTopLayerProps {
  readonly board: BoardProps;
  readonly pos: number;
}

const SliderTopLayer = ({ board, pos }: SliderTopLayerProps): ReactNode => {
  const { onError: handleError } = board;
  const style = useMemo(() => ({ clipPath: `inset(0 0 0 ${pos}%)` }), [pos]);

  return (
    <div
      className="compare-layer"
      data-testid="compare-slider-top"
      style={style}
    >
      <CompareFrame
        projectId={board.projectId}
        version={board.newer}
        title={board.newerTitle}
        kind={board.kind}
        viewport={board.viewport}
        scale={board.scale}
        onError={handleError}
      />
    </div>
  );
};

export { SliderTopLayer };
