import { useMemo } from "react";
import type {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
  ReactElement,
  ReactNode,
} from "react";

import type { CanvasFrame } from "./canvas-frames-model.js";
import { FlowFromHere } from "./flow-from-here.js";
import type { FrameBadge } from "./frame-label-model.js";
import { toLabelView } from "./frame-label-view-model.js";
import { FrameNameButton } from "./frame-name-button.js";
import { FrameRemoveButton } from "./frame-remove-button.js";
import type { ResizeEdge } from "./frame-resize-handles.js";
import { FrameStateMenu } from "./frame-state-menu.js";

interface LabelProps {
  frame: CanvasFrame;
  active: boolean;
  removable: boolean;
  directionId: string | null;
  badge?: FrameBadge;
  number?: string;
  title?: string;
  extras?: ReactNode;
  note?: ReactNode;
  onPointerDown: (event: ReactPointerEvent, frame: CanvasFrame) => void;
  onBodyPointerDown?: (
    eventValue: ReactPointerEvent,
    frame: CanvasFrame,
    body: boolean
  ) => void;
  onActivate: (frame: CanvasFrame) => void;
  onRemove: (frame: CanvasFrame) => void;
  onNudge: (frame: CanvasFrame, dx: number, dy: number) => void;
  onResizeStart: (
    event3: ReactPointerEvent,
    frame: CanvasFrame,
    edge: ResizeEdge
  ) => void;
}

const FrameLabel = ({
  frame,
  active,
  removable,
  directionId,
  badge,
  number,
  title,
  extras,
  note,
  onPointerDown,
  onActivate,
  onRemove,
  onNudge,
}: LabelProps): ReactElement => {
  const view = toLabelView(frame, badge, title, active);

  const style = useMemo(
    () => ({ "--frame-w": `${frame.width}px` }) as CSSProperties,
    [frame.width]
  );

  let testId: "variation-frame" | null = null;

  if (badge) {
    testId = "variation-frame";
  }

  return (
    <div
      className={view.className}
      data-frame-id={frame.id}
      data-direction-id={directionId}
      data-testid={testId}
      style={style}
    >
      <FrameNameButton
        active={active}
        frame={frame}
        hasBadge={Boolean(badge)}
        number={number}
        onActivate={onActivate}
        onNudge={onNudge}
        onPointerDown={onPointerDown}
        view={view}
      />
      <FrameStateMenu
        frameId={frame.id}
        frameName={view.name}
        directionId={directionId}
      />
      {!badge && <FlowFromHere frameId={frame.id} frameName={view.name} />}
      {extras}
      {note}
      {removable && (
        <FrameRemoveButton frame={frame} name={view.name} onRemove={onRemove} />
      )}
    </div>
  );
};

export { FrameLabel };

export type { LabelProps };
