import type { PointerEvent as ReactPointerEvent, ReactElement } from "react";

import { FrameResizeEdge } from "./frame-resize-edge.js";
import type { ResizeEdge } from "./resize-edge-model.js";

const EDGES: { edge: ResizeEdge; label: string }[] = [
  { edge: "right", label: "Resize width" },
  { edge: "bottom", label: "Resize height" },
  { edge: "corner", label: "Resize" },
];

const elementHandleAt = (eventValue: ReactPointerEvent): Element | null =>
  document
    .elementsFromPoint(eventValue.clientX, eventValue.clientY)
    .find((el) => el.classList.contains("resize-handle")) ?? null;

const passToElementHandle = (event3: ReactPointerEvent): boolean => {
  const handle = elementHandleAt(event3);

  if (!handle) {
    return false;
  }

  event3.stopPropagation();

  handle.dispatchEvent(
    new PointerEvent("pointerdown", {
      altKey: event3.altKey,
      bubbles: true,
      button: event3.button,
      buttons: event3.buttons,
      cancelable: true,
      clientX: event3.clientX,
      clientY: event3.clientY,
      composed: true,
      ctrlKey: event3.ctrlKey,
      isPrimary: event3.isPrimary,
      metaKey: event3.metaKey,
      pointerId: event3.pointerId,
      pointerType: event3.pointerType,
      screenX: event3.screenX,
      screenY: event3.screenY,
      shiftKey: event3.shiftKey,
    })
  );

  return true;
};

const FrameResizeHandles = ({
  onPointerDown,
}: {
  onPointerDown: (event4: ReactPointerEvent, edge: ResizeEdge) => void;
}): ReactElement => (
  <>
    {EDGES.map(({ edge }) => (
      <FrameResizeEdge
        key={edge}
        edge={edge}
        isPassed={passToElementHandle}
        start={onPointerDown}
      />
    ))}
    <span className="frame-size-readout" aria-hidden="true" />
  </>
);

export { FrameResizeHandles };

export type { ResizeEdge };
