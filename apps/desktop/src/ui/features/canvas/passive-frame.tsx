import { memo, useEffect, useRef, useState } from "react";
import type { RefObject, ReactElement } from "react";

import { pageFileOf } from "../chat/use-first-build.js";
import { PREVIEW_PAINTED_EVENT } from "../inspector/use-edit-history.js";
import type { CanvasFrame } from "./canvas-frames-model.js";
import { frameBaseName, FrameLabel } from "./canvas-frames.js";
import type { LabelProps } from "./canvas-frames.js";
import { FrameResizeHandles } from "./frame-resize-handles.js";
import { FrameSkeleton } from "./frame-skeleton.js";

const MOUNT_FALLBACK_MS = 1200;

let frontPainted = false;

let paintListening = false;

const resetPassiveMountGate = (): void => {
  frontPainted = false;

  if (paintListening || typeof globalThis === "undefined") {
    return;
  }

  paintListening = true;
  globalThis.addEventListener(PREVIEW_PAINTED_EVENT, () => {
    frontPainted = true;
  });
};

const useResetPassiveGateInFirstRender = (): void => {
  useState(resetPassiveMountGate);
};

const usePassiveMount = (ref: RefObject<HTMLDivElement | null>): boolean => {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    const el = ref.current;

    if (armed || !el) {
      return;
    }

    let front = frontPainted;
    let seen = false;

    const tryArm = (): void => {
      if (front && seen) {
        setArmed(true);
      }
    };

    const onPaint = (): void => {
      front = true;
      tryArm();
    };

    globalThis.addEventListener(PREVIEW_PAINTED_EVENT, onPaint);
    const timer = window.setTimeout(onPaint, MOUNT_FALLBACK_MS);
    const root = el.closest(".stage");

    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((event) => event.isIntersecting)) {
          return;
        }

        seen = true;
        tryArm();
      },
      { root, rootMargin: "50%" }
    );

    io.observe(el);

    return (): void => {
      globalThis.removeEventListener(PREVIEW_PAINTED_EVENT, onPaint);
      globalThis.clearTimeout(timer);
      io.disconnect();
    };
  }, [armed, ref]);

  return armed;
};

interface PassiveProps {
  frame: CanvasFrame;
  src: string | null;
  nextSrc: string | null;
  pending?: { step: string | null; missing: boolean };
  sandbox?: string;
  offset: { x: number; y: number };
  label: LabelProps;
  register: (id: string, el: HTMLDivElement | null) => void;
  frameRef?: (el: HTMLIFrameElement | null) => void;
  onNextLoad: (id: string) => void;
}

const PassiveFrame = ({
  frame,
  src,
  nextSrc,
  pending,
  sandbox,
  offset,
  label,
  register,
  frameRef,
  onNextLoad,
}: PassiveProps): ReactElement => {
  const name = label.badge
    ? `Variation ${label.badge.label}`
    : frameBaseName(frame);

  const box = useRef<HTMLDivElement | null>(null);
  const armed = usePassiveMount(box);

  return (
    <div
      ref={(el) => {
        box.current = el;
        register(frame.id, el);
      }}
      className="canvas-frame"
      data-frame-id={frame.id}
      data-direction-id={label.directionId ?? undefined}
      style={{
        height: frame.height,
        left: frame.x - offset.x,
        top: frame.y - offset.y,
        width: frame.width,
      }}
    >
      {(armed ? [src, nextSrc] : []).map((url, index) =>
        url ? (
          <iframe
            key={url}
            ref={index === 0 ? frameRef : undefined}
            title={`${name} preview`}
            className={index === 0 ? "frame passive" : "frame passive next"}
            src={url}
            sandbox={sandbox}
            width={frame.width}
            height={frame.height}
            tabIndex={-1}
            onLoad={index === 0 ? undefined : (): void => onNextLoad(frame.id)}
          />
        ) : null
      )}
      {pending && (
        <FrameSkeleton
          step={pending.step}
          page={pageFileOf(frame.path)}
          missing={pending.missing ? pageFileOf(frame.path) : undefined}
        />
      )}
      <div
        className="frame-hit"
        aria-hidden="true"
        onPointerDown={(eventValue) =>
          label.onBodyPointerDown
            ? label.onBodyPointerDown(eventValue, frame, true)
            : label.onPointerDown(eventValue, frame)
        }
      />
      <FrameLabel {...label} />
      <FrameResizeHandles
        onPointerDown={(event3, edge) =>
          label.onResizeStart(event3, frame, edge)
        }
      />
    </div>
  );
};

type PassiveEntry = PassiveProps;

const liveLabel = (cur: LabelProps, live: () => LabelProps): LabelProps => ({
  ...cur,
  onActivate: (canvasFrame) => live().onActivate(canvasFrame),
  onBodyPointerDown: cur.onBodyPointerDown
    ? (event4, canvasFrameValue, body) =>
        live().onBodyPointerDown?.(event4, canvasFrameValue, body)
    : undefined,
  onNudge: (canvasFrame3, dx, dy) => live().onNudge(canvasFrame3, dx, dy),
  onPointerDown: (event5, canvasFrame4) =>
    live().onPointerDown(event5, canvasFrame4),
  onRemove: (canvasFrame5) => live().onRemove(canvasFrame5),
  onResizeStart: (event6, canvasFrame6, edge) =>
    live().onResizeStart(event6, canvasFrame6, edge),
});

const StablePassiveFrame = memo(
  ({
    id,
    entries,
  }: {
    id: string;
    sig: string;
    entries: RefObject<Map<string, PassiveEntry>>;
  }) => {
    const cur = entries.current.get(id);

    if (!cur) {
      return null;
    }

    const live = (): PassiveProps => entries.current.get(id) ?? cur;

    return (
      <PassiveFrame
        {...cur}
        label={liveLabel(cur.label, () => live().label)}
        onNextLoad={(frameId) => live().onNextLoad(frameId)}
      />
    );
  },
  (first, second) =>
    first.sig === second.sig &&
    first.entries === second.entries &&
    first.id === second.id
);

StablePassiveFrame.displayName = "StablePassiveFrame";

export { PassiveFrame, StablePassiveFrame, useResetPassiveGateInFirstRender };

export type { PassiveEntry };
