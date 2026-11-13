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
import { useIsFrameSelected } from "./use-frame-selection.js";

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

const toSelectedClass = (className: string, isSelected: boolean): string => {
  if (isSelected) {
    return `${className} selected`;
  }

  return className;
};

const FrameLabel = ({
  frame,
  active,
  removable,
  directionId,
  badge,
  title,
  extras,
  note,
  onPointerDown,
  onActivate,
  onRemove,
  onNudge,
}: LabelProps): ReactElement => {
  const view = toLabelView(frame, badge, title, active);
  const isSelected = useIsFrameSelected(frame.id);
  const className = toSelectedClass(view.className, isSelected);

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
      className={className}
      data-frame-id={frame.id}
      data-direction-id={directionId}
      data-testid={testId}
      style={style}
    >
      <FrameNameButton
        active={active}
        frame={frame}
        onActivate={onActivate}
        onNudge={onNudge}
        onPointerDown={onPointerDown}
        view={view}
      />
      {note}
      <div className="frame-label-tools">
        <FrameStateMenu
          frameId={frame.id}
          frameName={view.name}
          directionId={directionId}
        />
        {!badge && <FlowFromHere frameId={frame.id} frameName={view.name} />}
        {removable && (
          <FrameRemoveButton
            frame={frame}
            name={view.name}
            onRemove={onRemove}
          />
        )}
        {extras}
      </div>
    </div>
  );
};

export { FrameLabel };

export type { LabelProps };
