import { useCallback } from "react";
import type { PointerEvent, ReactElement } from "react";

import { IS_MAC } from "../../canvas-hook-slots.js";
import { toFrameAlignTip } from "./frame-align-model.js";
import type { FrameAlignLayout, FrameAlignTool } from "./frame-align-model.js";

interface FrameAlignButtonProps {
  readonly isDisabled: boolean;
  readonly onAlign: (layout: FrameAlignLayout) => void;
  readonly tool: FrameAlignTool;
}

const stopPointer = (event: PointerEvent<HTMLButtonElement>): void =>
  event.stopPropagation();

const FrameAlignButton = ({
  isDisabled,
  onAlign,
  tool,
}: FrameAlignButtonProps): ReactElement => {
  const alignByTool = useCallback(
    () => onAlign(tool.layout),
    [onAlign, tool.layout]
  );

  return (
    <button
      type="button"
      className="frame-align-tool"
      aria-label={tool.label}
      disabled={isDisabled}
      data-tip={toFrameAlignTip(tool, IS_MAC)}
      onPointerDown={stopPointer}
      onClick={alignByTool}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={tool.glyph} />
      </svg>
    </button>
  );
};

export { FrameAlignButton };
