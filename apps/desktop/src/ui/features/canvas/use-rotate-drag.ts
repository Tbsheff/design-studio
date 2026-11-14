import { routes as directEditRoutes } from "@design-studio/actions/direct-edit/routes";
import type { SelectionContext } from "@design-studio/contracts";
import { useCallback, useMemo, useTransition } from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";

import { createLiveStore } from "../../platform/live-store.js";
import type { LiveStore } from "../../platform/live-store.js";
import { useAction } from "../../platform/query.js";
import { rotateHandleCopy } from "./copy.js";
import type { Options } from "./resize-handles-model.js";
import { toScale } from "./resize-handles-model.js";
import {
  isRotateDrag,
  toPointerAngle,
  toPreviewRotate,
  toRotateAngle,
  toRotateBase,
  toRotateBody,
  toRotateValue,
} from "./rotate-drag-model.js";
import type {
  RotateBase,
  RotateLabel,
  RotatePoint,
} from "./rotate-drag-model.js";

interface RotateDrag {
  readonly label: LiveStore<RotateLabel | null>;
  readonly onRotateDown: (event: ReactPointerEvent<HTMLElement>) => void;
}

interface RotateRequest {
  readonly angle: number;
  readonly options: Options;
  readonly target: SelectionContext;
}

interface RotateSession {
  readonly commit: (request: RotateRequest) => void;
  readonly label: LiveStore<RotateLabel | null>;
  readonly live: RefObject<Options>;
}

interface RotateMove {
  angle: number;
  isMoved: boolean;
}

interface RotateFrame {
  readonly center: RotatePoint;
  readonly left: number;
  readonly top: number;
  readonly zoom: number;
}

const ROTATING_CLASS = "element-rotating";

const toFrame = (handle: HTMLElement): RotateFrame => {
  const frame = handle.closest(".resize-frame") ?? handle;
  const box = frame.getBoundingClientRect();

  return {
    center: { x: box.left + box.width / 2, y: box.top + box.height / 2 },
    left: box.left,
    top: box.top,
    zoom: toScale(handle) || 1,
  };
};

const postPreview = (
  session: RotateSession,
  target: SelectionContext,
  rotate: string
): void => {
  session.live.current.post({
    selector: target.selector,
    style: { rotate },
    type: "preview-style",
  });
};

const toLabel = (
  frame: RotateFrame,
  angle: number,
  event: PointerEvent
): RotateLabel => ({
  angle,
  x: (event.clientX - frame.left) / frame.zoom,
  y: (event.clientY - frame.top) / frame.zoom,
});

interface RotateRun {
  readonly base: RotateBase;
  readonly frame: RotateFrame;
  readonly session: RotateSession;
  readonly start: RotatePoint;
  readonly state: RotateMove;
  readonly target: SelectionContext;
}

const moveRotate = (run: RotateRun, event: PointerEvent): void => {
  const point = { x: event.clientX, y: event.clientY };
  const { base, frame, session, start, state, target } = run;

  if (!state.isMoved && !isRotateDrag(start, point)) {
    return;
  }

  state.isMoved = true;

  const delta =
    toPointerAngle(frame.center, point) - toPointerAngle(frame.center, start);

  state.angle = toRotateAngle(base.start, delta, event.shiftKey);

  postPreview(session, target, toPreviewRotate(state.angle, base));
  session.label.set(toLabel(frame, state.angle, event));
};

const listenRotate = (
  session: RotateSession,
  target: SelectionContext,
  event: ReactPointerEvent<HTMLElement>
): void => {
  const handle = event.currentTarget;
  const abort = new AbortController();
  const { signal } = abort;
  const start = { x: event.clientX, y: event.clientY };
  const frame = toFrame(handle);
  const base = toRotateBase(target);
  const state: RotateMove = { angle: base.start, isMoved: false };

  const end = (isCommitting: boolean): void => {
    abort.abort();
    session.label.set(null);
    document.body.classList.remove(ROTATING_CLASS);
    session.live.current.holdSwap?.(false, !isCommitting);
  };

  const cancel = (): void => {
    end(false);

    if (state.isMoved) {
      session.live.current.post({ type: "preview-reset" });
    }
  };

  const onUp = (): void => {
    const isChanged = state.isMoved && state.angle !== base.start;

    if (!isChanged) {
      cancel();

      return;
    }

    end(true);
    session.commit({
      angle: state.angle,
      options: session.live.current,
      target,
    });
  };

  const onEscape = (key: KeyboardEvent): void => {
    if (key.key === "Escape") {
      key.preventDefault();
      key.stopPropagation();
      cancel();
    }
  };

  const run = { base, frame, session, start, state, target };

  const onMove = (move: PointerEvent): void => moveRotate(run, move);

  handle.addEventListener("pointermove", onMove, { signal });
  handle.addEventListener("pointerup", onUp, { signal });
  handle.addEventListener("pointercancel", cancel, { signal });
  globalThis.addEventListener("keydown", onEscape, { capture: true, signal });
};

const beginRotate = (
  session: RotateSession,
  target: SelectionContext | null,
  event: ReactPointerEvent<HTMLElement>
): void => {
  if (event.button !== 0 || target === null || target.source === null) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  event.currentTarget.setPointerCapture(event.pointerId);
  document.body.classList.add(ROTATING_CLASS);
  session.live.current.holdSwap?.(true, false);
  listenRotate(session, target, event);
};

const toOptimisticId = (): string => `rotate-${crypto.randomUUID()}`;

const useRotateCommit = (): RotateSession["commit"] => {
  const { run } = useAction(directEditRoutes.applyDirectEdit);
  const [, startWork] = useTransition();

  return useCallback(
    (request: RotateRequest): void => {
      const { options, target } = request;
      const { directionId } = options;
      const style = { rotate: toRotateValue(request.angle) };

      if (directionId === null || target.source === null) {
        return;
      }

      const id = toOptimisticId();
      options.post({
        id,
        patch: {
          selector: target.selector,
          style: { ...style },
          trusted: true,
        },
        type: "optimistic-apply",
        written: false,
      });

      startWork(async () => {
        const result = await run(
          toRotateBody(
            { directionId, projectId: options.projectId },
            target,
            style
          )
        );

        if (result === null) {
          options.post({
            id,
            ok: false,
            reason: rotateHandleCopy.failed,
            type: "optimistic-settle",
          });
          options.onError(rotateHandleCopy.failed);

          return;
        }

        options.post({ id, ok: true, type: "optimistic-settle" });
        options.refreshRects();
      });
    },
    [run]
  );
};

const useRotateDrag = (
  live: RefObject<Options>,
  target: SelectionContext | null
): RotateDrag => {
  const label = useMemo(() => createLiveStore<RotateLabel | null>(null), []);
  const commit = useRotateCommit();

  const session = useMemo(
    () => ({ commit, label, live }),
    [commit, label, live]
  );

  const onRotateDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>): void =>
      beginRotate(session, target, event),
    [session, target]
  );

  return { label, onRotateDown };
};

export { useRotateDrag };

export type { RotateDrag };
