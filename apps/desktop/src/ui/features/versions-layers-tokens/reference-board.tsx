import { useMemo, useState } from "react";
import type { ReactNode } from "react";

import type { BoardProps } from "./compare-board-types.js";
import { CompareFrame } from "./compare-frame.js";
import { CompareLabel } from "./compare-label.js";
import { CompareStage } from "./compare-stage.js";
import { PERCENT_MAX } from "./compare-wipe-model.js";
import { PicturePicker } from "./picture-picker.js";
import { ReferenceControls } from "./reference-controls.js";
import { ReferenceLayer } from "./reference-layer.js";
import { usePicture } from "./use-picture.js";
import { useWipe } from "./use-wipe.js";
import { WipeBoard } from "./wipe-board.js";
import { toWipeHandle } from "./wipe-handle.js";

const REFERENCE_OPACITY = 100;

const ReferenceBoard = (props: BoardProps): ReactNode => {
  const { scale, viewport } = props;
  const width = viewport.width * scale;
  const height = viewport.height * scale;
  const wipe = useWipe();
  const { picture, setPicture } = usePicture();
  const [opacity, setOpacity] = useState(REFERENCE_OPACITY);
  const rounded = Math.round(wipe.pos);
  const size = useMemo(() => ({ height, width }), [height, width]);

  const labels = (
    <>
      <CompareLabel side="B" title={props.newerTitle} align="start" />
      <ReferenceControls
        opacity={opacity}
        picture={picture}
        onOpacity={setOpacity}
        onPick={setPicture}
      />
    </>
  );

  if (!picture) {
    return (
      <CompareStage width={width} labels={labels}>
        <PicturePicker isCompact={false} onPick={setPicture} size={size} />
      </CompareStage>
    );
  }

  return (
    <CompareStage width={width} labels={labels}>
      <WipeBoard
        height={height}
        testId="compare-reference"
        width={width}
        wipe={wipe}
      >
        <CompareFrame
          projectId={props.projectId}
          version={props.newer}
          title={props.newerTitle}
          kind={props.kind}
          viewport={viewport}
          scale={scale}
          onError={props.onError}
        />
        <ReferenceLayer opacity={opacity} picture={picture} pos={wipe.pos} />
        {toWipeHandle({
          handleRef: wipe.handle,
          onKeyDown: wipe.onKeyDown,
          pos: wipe.pos,
          valueText: `${rounded}% frame, ${PERCENT_MAX - rounded}% reference`,
          width,
        })}
      </WipeBoard>
    </CompareStage>
  );
};

export { ReferenceBoard };
