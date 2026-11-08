import { useCallback } from "react";
import type {
  KeyboardEvent,
  PointerEvent as ReactPointerEvent,
  ReactElement,
} from "react";

import type { CanvasFrame } from "./canvas-frames-model.js";
import { toNudgeStep } from "./frame-label-view-model.js";
import type { FrameLabelView } from "./frame-label-view-model.js";

const FrameNameButton = ({
  active,
  frame,
  hasBadge,
  number,
  onActivate,
  onNudge,
  onPointerDown,
  view,
}: {
  active: boolean;
  frame: CanvasFrame;
  hasBadge: boolean;
  number: string | undefined;
  onActivate: (frame: CanvasFrame) => void;
  onNudge: (frame: CanvasFrame, dx: number, dy: number) => void;
  onPointerDown: (event: ReactPointerEvent, frame: CanvasFrame) => void;
  view: FrameLabelView;
}): ReactElement => {
  const press = useCallback(
    (event: ReactPointerEvent) => onPointerDown(event, frame),
    [onPointerDown, frame]
  );

  const key = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      const step = toNudgeStep(event.key, event.shiftKey);

      if (step) {
        event.preventDefault();
        onNudge(frame, step[0], step[1]);

        return;
      }

      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onActivate(frame);
      }
    },
    [frame, onNudge, onActivate]
  );

  return (
    <button
      type="button"
      className="frame-name"
      aria-pressed={active}
      aria-label={`${view.name} frame`}
      data-tip={view.tip}
      onPointerDown={press}
      onKeyDown={key}
    >
      {number && <span className="frame-number">{number}</span>}
      <span className="frame-title">{view.heading}</span>
      {!hasBadge && frame.label?.trim() && (
        <span className="frame-size">{view.size}</span>
      )}
    </button>
  );
};

export { FrameNameButton };
