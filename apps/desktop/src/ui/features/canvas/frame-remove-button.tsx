import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import type { CanvasFrame } from "./canvas-frames-model.js";
import { copy } from "./copy.js";

const ICON_SIZE = 12;

const FrameRemoveButton = ({
  frame,
  name,
  onRemove,
}: {
  frame: CanvasFrame;
  name: string;
  onRemove: (frame: CanvasFrame) => void;
}): ReactElement => {
  const remove = useCallback(() => onRemove(frame), [onRemove, frame]);

  return (
    <button
      type="button"
      className="frame-remove"
      aria-label={`Remove ${name} frame`}
      data-tip={copy.removeFrame}
      onClick={remove}
    >
      <Icon name="close" size={ICON_SIZE} />
    </button>
  );
};

export { FrameRemoveButton };
