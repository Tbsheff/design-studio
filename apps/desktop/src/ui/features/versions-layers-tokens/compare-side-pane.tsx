import { useMemo } from "react";
import type { ReactNode } from "react";

import type { BoardProps } from "./compare-board-types.js";
import { CompareSideStage } from "./compare-side-stage.js";

interface CompareSidePaneProps {
  readonly board: BoardProps;
  readonly side: "A" | "B";
}

const CompareSidePane = ({ board, side }: CompareSidePaneProps): ReactNode => {
  const { newer, newerTitle, older, olderTitle, scale, viewport } = board;
  let version = newer;
  let title = newerTitle;

  if (side === "A") {
    version = older;
    title = olderTitle;
  }

  const width = viewport.width * scale;
  const labelStyle = useMemo(() => ({ width }), [width]);

  return (
    <div className="compare-pane">
      <div className="compare-label" data-tip={title} style={labelStyle}>
        <span className="badge accent">{side}</span>
        <span className="compare-title truncate">{title}</span>
      </div>
      <CompareSideStage board={board} title={title} version={version} />
    </div>
  );
};

export { CompareSidePane };
