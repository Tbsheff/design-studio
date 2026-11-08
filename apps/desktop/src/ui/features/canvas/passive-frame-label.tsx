import type { ReactElement } from "react";

import { FrameLabel } from "./canvas-frames.js";
import type { LabelProps } from "./canvas-frames.js";

const PassiveFrameLabel = ({ label }: { label: LabelProps }): ReactElement => {
  const {
    onPointerDown: handlePointerDown,
    onBodyPointerDown: handleBodyPointerDown,
    onActivate: handleActivate,
    onRemove: handleRemove,
    onNudge: handleNudge,
    onResizeStart: handleResizeStart,
  } = label;

  return (
    <FrameLabel
      frame={label.frame}
      active={label.active}
      removable={label.removable}
      directionId={label.directionId}
      badge={label.badge}
      number={label.number}
      title={label.title}
      extras={label.extras}
      note={label.note}
      onPointerDown={handlePointerDown}
      onBodyPointerDown={handleBodyPointerDown}
      onActivate={handleActivate}
      onRemove={handleRemove}
      onNudge={handleNudge}
      onResizeStart={handleResizeStart}
    />
  );
};

export { PassiveFrameLabel };
