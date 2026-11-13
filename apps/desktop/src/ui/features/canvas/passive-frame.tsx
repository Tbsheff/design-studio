import { useCallback, useMemo, useRef } from "react";
import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactElement,
} from "react";

import { pageFileOf } from "../chat/use-first-build.js";
import { FrameResizeHandles } from "./frame-resize-handles.js";
import type { ResizeEdge } from "./frame-resize-handles.js";
import { FrameSkeleton } from "./frame-skeleton-view.js";
import { FrameStillImage } from "./frame-still-image.js";
import { PassiveFrameLabel } from "./passive-frame-label.js";
import {
  routeHitPointerDown,
  toFrameName,
  toFrontRef,
  toMissingPage,
  toPassiveStyle,
} from "./passive-frame-model.js";
import type { PassiveProps } from "./passive-frame-model.js";
import { PassiveIframe } from "./passive-iframe.js";
import { usePassiveMode } from "./use-passive-mode.js";

const PassiveFrame = (props: PassiveProps): ReactElement => {
  const { frame, pending, sandbox, offset, label, register } = props;
  const { frameRef, onNextLoad } = props;
  const name = toFrameName(label, frame);
  const box = useRef<HTMLDivElement | null>(null);
  const mode = usePassiveMode(box, props);
  const { onPointerEnter, onPointerLeave, still, urls } = mode;

  const setBox = useCallback(
    (el: HTMLDivElement | null): void => {
      box.current = el;
      register(frame.id, el);
    },
    [frame.id, register]
  );

  const style = useMemo(() => toPassiveStyle(frame, offset), [frame, offset]);

  const onHitPointerDown = useCallback(
    (event: ReactPointerEvent): void =>
      routeHitPointerDown(label, frame, event),
    [frame, label]
  );

  const onHitContextMenu = useCallback((event: ReactMouseEvent): void => {
    event.preventDefault();
  }, []);

  const onResizeStart = useCallback(
    (event: ReactPointerEvent, edge: ResizeEdge): void =>
      label.onResizeStart(event, frame, edge),
    [frame, label]
  );

  return (
    <div
      ref={setBox}
      className="canvas-frame"
      data-frame-id={frame.id}
      data-direction-id={label.directionId}
      style={style}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <FrameStillImage url={still} />
      {urls.map((entry) => (
        <PassiveIframe
          key={entry.url}
          url={entry.url}
          name={name}
          width={frame.width}
          height={frame.height}
          frameId={frame.id}
          isNext={entry.isNext}
          sandbox={sandbox}
          frameRef={toFrontRef(entry.isNext, frameRef)}
          onNextLoad={onNextLoad}
        />
      ))}
      {pending && (
        <FrameSkeleton
          step={pending.step}
          page={pageFileOf(frame.path)}
          missing={toMissingPage(pending, pageFileOf(frame.path))}
        />
      )}
      <div
        className="frame-hit"
        aria-hidden="true"
        onPointerDown={onHitPointerDown}
        onContextMenu={onHitContextMenu}
      />
      <PassiveFrameLabel label={label} />
      <FrameResizeHandles onPointerDown={onResizeStart} />
    </div>
  );
};

export { PassiveFrame };

export type { PassiveProps };
