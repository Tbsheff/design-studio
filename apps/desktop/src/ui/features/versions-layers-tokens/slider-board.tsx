import type { ReactNode } from "react";

import type { BoardEntry } from "./compare-board-types.js";
import { CompareFrame } from "./compare-frame.js";
import { CompareLabel } from "./compare-label.js";
import { CompareStage } from "./compare-stage.js";
import { PERCENT_MAX } from "./compare-wipe-model.js";
import { SliderTopLayer } from "./slider-top-layer.js";
import { useWipe } from "./use-wipe.js";
import { WipeBoard } from "./wipe-board.js";
import { toWipeHandle } from "./wipe-handle.js";

const SliderBoard = ({ board }: BoardEntry): ReactNode => {
  const props = board;
  const { scale, viewport } = props;
  const width = viewport.width * scale;
  const wipe = useWipe();
  const rounded = Math.round(wipe.pos);

  const labels = (
    <>
      <CompareLabel side="A" title={props.olderTitle} align="start" />
      <CompareLabel side="B" title={props.newerTitle} align="end" />
    </>
  );

  return (
    <CompareStage width={width} labels={labels}>
      <WipeBoard
        height={viewport.height * scale}
        testId="compare-slider"
        width={width}
        wipe={wipe}
      >
        <CompareFrame
          projectId={props.projectId}
          version={props.older}
          title={props.olderTitle}
          kind={props.kind}
          viewport={viewport}
          scale={scale}
          onError={props.onError}
        />
        <SliderTopLayer board={props} pos={wipe.pos} />
        {toWipeHandle({
          handleRef: wipe.handle,
          onKeyDown: wipe.onKeyDown,
          pos: wipe.pos,
          valueText: `${rounded}% A, ${PERCENT_MAX - rounded}% B`,
          width,
        })}
      </WipeBoard>
    </CompareStage>
  );
};

export { SliderBoard };
