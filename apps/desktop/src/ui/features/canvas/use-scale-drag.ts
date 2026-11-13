import { routes as layerStyleRoutes } from "@design-studio/actions/layer-style/routes";
import type { SelectionContext } from "@design-studio/contracts";
import { useCallback, useEffect, useMemo, useRef, useTransition } from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";

import { CANVAS_TOOL_EVENT } from "../../platform/canvas-tool.js";
import { createLiveStore, useLive } from "../../platform/live-store.js";
import type { LiveStore } from "../../platform/live-store.js";
import { useAction } from "../../platform/query.js";
import {
  requestScaleMode,
  scaleFocusCount,
  scaleKeepTokens,
  scaleMode,
  stopScaleMode,
} from "../../platform/scale-mode.js";
import { isTextField } from "../../platform/typing-target.js";
import { scaleCopy } from "./copy.js";
import type { Options } from "./resize-handles-model.js";
import { toScale } from "./resize-handles-model.js";
import {
  FULL_PERCENT,
  isScaleDrag,
  toGhostRect,
  toScaleLayerId,
  toScalePercent,
} from "./scale-drag-model.js";
import type { ScaleCorner, ScaleGhost } from "./scale-drag-model.js";

interface ScaleDrag {
  readonly ghost: LiveStore<ScaleGhost | null>;
  readonly onScaleDown: (
    corner: ScaleCorner,
    event: ReactPointerEvent<HTMLElement>
  ) => void;
}

interface ScaleRequest {
  readonly options: Options;
  readonly percent: number;
  readonly target: SelectionContext;
}

interface ScaleSession {
  readonly commit: (request: ScaleRequest) => void;
  readonly ghost: LiveStore<ScaleGhost | null>;
  readonly live: RefObject<Options>;
}

const hasModifier = (event: KeyboardEvent): boolean =>
  event.metaKey || event.ctrlKey || event.altKey || event.shiftKey;

const isScaleKey = (event: KeyboardEvent): boolean =>
  event.code === "KeyK" &&
  !event.repeat &&
  !hasModifier(event) &&
  !isTextField(event.target);

const isLeaveKey = (event: KeyboardEvent): boolean => {
  if (event.key === "Escape") {
    return true;
  }

  return (
    event.code === "KeyV" && !hasModifier(event) && !isTextField(event.target)
  );
};

const routeModeKey = (event: KeyboardEvent): void => {
  if (isLeaveKey(event)) {
    stopScaleMode();

    return;
  }

  if (isScaleKey(event) && !event.defaultPrevented) {
    event.preventDefault();
    requestScaleMode();
  }
};

const useScaleModeKeys = (target: SelectionContext | null): void => {
  const count = useLive(scaleFocusCount);
  const seen = useRef(count);
  const selector = target?.selector ?? null;

  useEffect(() => {
    if (seen.current === count) {
      return;
    }

    seen.current = count;

    if (selector !== null) {
      scaleMode.set(true);
    }
  }, [count, selector]);

  const shown = useRef(selector);

  useEffect(() => {
    if (shown.current === selector) {
      return;
    }

    shown.current = selector;
    stopScaleMode();
  }, [selector]);

  useEffect(() => {
    globalThis.addEventListener("keydown", routeModeKey);
    globalThis.addEventListener(CANVAS_TOOL_EVENT, stopScaleMode);

    return (): void => {
      globalThis.removeEventListener("keydown", routeModeKey);
      globalThis.removeEventListener(CANVAS_TOOL_EVENT, stopScaleMode);
    };
  }, []);
};

const listenScale = (
  session: ScaleSession,
  target: SelectionContext,
  corner: ScaleCorner,
  event: ReactPointerEvent<HTMLElement>
): void => {
  const handle = event.currentTarget;
  const abort = new AbortController();
  const { signal } = abort;
  const startX = event.clientX;
  const startY = event.clientY;
  const zoom = toScale(handle) || 1;
  let percent = FULL_PERCENT;

  const end = (): void => {
    abort.abort();
    session.ghost.set(null);
    document.body.classList.remove("element-resizing");
  };

  const onMove = (move: PointerEvent): void => {
    const screen = { dx: move.clientX - startX, dy: move.clientY - startY };

    if (!isScaleDrag(screen)) {
      percent = FULL_PERCENT;
      session.ghost.set(null);

      return;
    }

    percent = toScalePercent(target.rect, corner, {
      dx: screen.dx / zoom,
      dy: screen.dy / zoom,
    });
    session.ghost.set({
      percent,
      rect: toGhostRect(target.rect, corner, percent),
      selector: target.selector,
    });
  };

  const onUp = (): void => {
    end();

    if (percent !== FULL_PERCENT) {
      session.commit({ options: session.live.current, percent, target });
    }
  };

  const onEscape = (key: KeyboardEvent): void => {
    if (key.key === "Escape") {
      key.preventDefault();
      key.stopPropagation();
      end();
    }
  };

  handle.addEventListener("pointermove", onMove, { signal });
  handle.addEventListener("pointerup", onUp, { signal });
  handle.addEventListener("pointercancel", end, { signal });
  globalThis.addEventListener("keydown", onEscape, { capture: true, signal });
};

const beginScale = (
  session: ScaleSession,
  target: SelectionContext | null,
  corner: ScaleCorner,
  event: ReactPointerEvent<HTMLElement>
): void => {
  if (event.button !== 0 || target === null) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  event.currentTarget.setPointerCapture(event.pointerId);
  document.body.classList.add("element-resizing");
  listenScale(session, target, corner, event);
};

const useScaleCommit = (): ScaleSession["commit"] => {
  const { run } = useAction(layerStyleRoutes.updateLayerStyle);
  const [, startWork] = useTransition();

  return useCallback(
    (request: ScaleRequest): void => {
      const scaleLayerId = toScaleLayerId(request.target);
      const { options } = request;

      if (scaleLayerId === null) {
        return;
      }

      startWork(async () => {
        const result = await run({
          directionId: options.directionId,
          factor: request.percent / FULL_PERCENT,
          layerId: scaleLayerId,
          projectId: options.projectId,
          shouldKeepTokens: scaleKeepTokens.get(),
        });

        if (result === null) {
          options.onError(scaleCopy.failed);

          return;
        }

        options.refreshRects();
      });
    },
    [run]
  );
};

const useScaleDrag = (
  live: RefObject<Options>,
  target: SelectionContext | null
): ScaleDrag => {
  const ghost = useMemo(() => createLiveStore<ScaleGhost | null>(null), []);
  const commit = useScaleCommit();

  const session = useMemo(
    () => ({ commit, ghost, live }),
    [commit, ghost, live]
  );

  useScaleModeKeys(target);

  const onScaleDown = useCallback(
    (corner: ScaleCorner, event: ReactPointerEvent<HTMLElement>): void =>
      beginScale(session, target, corner, event),
    [session, target]
  );

  return { ghost, onScaleDown };
};

export { useScaleDrag };

export type { ScaleDrag };
