import type { ReactElement } from "react";

import type { CanvasCommandsInput, ViewProps } from "./canvas-types.js";

const CanvasCommandsSlot = ({
  host,
  input,
}: {
  host: NonNullable<ViewProps["commandsHost"]>;
  input: CanvasCommandsInput;
}): ReactElement => {
  const Host = host;
  const { onLayers, onSource, setSelectMode } = input;

  return (
    <Host
      check={input.check}
      comment={input.comment}
      dark={input.dark}
      draw={input.draw}
      hasHead={input.hasHead}
      layersOpen={input.layersOpen}
      live={input.live}
      lofi={input.lofi}
      onLayers={onLayers}
      onSource={onSource}
      outline={input.outline}
      play={input.play}
      selectMode={input.selectMode}
      setSelectMode={setSelectMode}
      zoomBy={input.zoomBy}
    />
  );
};

export { CanvasCommandsSlot };
