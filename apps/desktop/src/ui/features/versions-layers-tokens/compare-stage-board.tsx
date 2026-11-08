import type { ReactNode, RefObject } from "react";

import type { BoardProps } from "./compare-board-types.js";
import type { Mode } from "./compare-mode-model.js";
import { toCompareClass } from "./compare-mode-model.js";
import { CompareSidePane } from "./compare-side-pane.js";
import { OverlayBoard } from "./overlay-board.js";
import { ReferenceBoard } from "./reference-board.js";
import { SliderBoard } from "./slider-board.js";

interface StageProps {
  readonly board: BoardProps;
  readonly error: string | null;
  readonly isStacked: boolean;
  readonly mode: Mode;
  readonly stageRef: RefObject<HTMLDivElement | null>;
}

const CompareStageBoard = ({
  board,
  error,
  isStacked,
  mode,
  stageRef,
}: StageProps): ReactNode => (
  <div
    className={toCompareClass(mode, isStacked)}
    ref={stageRef}
    data-mode={mode}
  >
    {error && (
      <div className="stage-message" role="alert">
        {error}
      </div>
    )}
    {mode === "side" && (
      <>
        <CompareSidePane board={board} side="A" />
        <CompareSidePane board={board} side="B" />
      </>
    )}
    {mode === "slider" && <SliderBoard board={board} />}
    {mode === "overlay" && <OverlayBoard board={board} />}
    {mode === "reference" && <ReferenceBoard board={board} />}
  </div>
);

export { CompareStageBoard };
