import type { PointerEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import { FrameAlignButton } from "./frame-align-button.js";
import {
  FRAME_ALIGN_TOOLS,
  FRAME_SPREAD_TOOLS,
  isFrameAlignReady,
} from "./frame-align-model.js";
import { useFrameAlign } from "./use-frame-align.js";

const stopPointer = (event: PointerEvent<HTMLDivElement>): void =>
  event.stopPropagation();

const FrameAlignBar = ({ count }: { count: number }): ReactElement => {
  const onAlign = useFrameAlign();

  return (
    <div
      className="frame-align-bar"
      role="toolbar"
      aria-label={copy.frameAlignBar}
      data-testid="frame-align-bar"
      onPointerDown={stopPointer}
    >
      {FRAME_ALIGN_TOOLS.map((tool) => (
        <FrameAlignButton
          key={tool.layout}
          tool={tool}
          isDisabled={!isFrameAlignReady(tool.layout, count)}
          onAlign={onAlign}
        />
      ))}
      <span className="frame-align-sep" aria-hidden="true" />
      {FRAME_SPREAD_TOOLS.map((tool) => (
        <FrameAlignButton
          key={tool.layout}
          tool={tool}
          isDisabled={!isFrameAlignReady(tool.layout, count)}
          onAlign={onAlign}
        />
      ))}
    </div>
  );
};

export { FrameAlignBar };
