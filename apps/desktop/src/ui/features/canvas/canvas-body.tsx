import { useCallback, useMemo } from "react";
import type { ReactElement } from "react";

import { frameName } from "./canvas-frame-ops.js";
import { hostedClose } from "./canvas-helpers.js";
import { CanvasLayersPanel } from "./canvas-layers.js";
import type { CanvasStageProps } from "./canvas-stage-types.js";
import { CanvasStage } from "./canvas-stage.js";
import { CopyPngHost } from "./copy-png-host.js";
import { FrameStateSlotContext } from "./frame-state-slot-context.js";
import type { FrameStateSlotArgs } from "./frame-state-slot-context.js";

const CanvasBody = ({
  edits,
  preview,
  props,
  renderSlot,
  stage,
  wiring,
}: CanvasStageProps & {
  renderSlot: (args: FrameStateSlotArgs) => ReactElement;
}): ReactElement => {
  const { active, pane, layersOpen, setSelectMode } = stage;
  const { layerEdits } = edits;

  const { closeLayers, place } = pane;

  const selectMode = useCallback(() => setSelectMode(true), [setSelectMode]);

  const close = useMemo(
    () => hostedClose(props.shell, closeLayers),
    [props.shell, closeLayers]
  );

  return (
    <div className="canvas-body">
      <CopyPngHost frames={stage.canvasFrames} props={props} />
      {layersOpen &&
        place(
          <CanvasLayersPanel
            frames={preview.frames}
            edits={layerEdits}
            frameName={frameName(active)}
            isEmpty={stage.note === "empty"}
            selection={props.selection}
            onSelectMode={selectMode}
            onClose={close}
          />
        )}
      <FrameStateSlotContext.Provider value={renderSlot}>
        <CanvasStage
          props={props}
          stage={stage}
          preview={preview}
          edits={edits}
          wiring={wiring}
        />
      </FrameStateSlotContext.Provider>
    </div>
  );
};

export { CanvasBody };
