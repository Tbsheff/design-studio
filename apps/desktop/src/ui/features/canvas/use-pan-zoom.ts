import type { ZoomKey } from "@design-studio/contracts";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

import { createLiveStore } from "../../platform/live-store.js";
import type { LiveStore } from "../../platform/live-store.js";
import { uiStore } from "../../platform/storage.js";
import type { ZoomSetting } from "../../platform/storage.js";
import { isTypingTarget } from "../../platform/typing-target.js";
import type { Box } from "./canvas-frames-model.js";
import {
  CLICK_ZOOM,
  LINE_PX,
  SELECTION_PAD,
  WHEEL_IDLE_MS,
  ZOOM_100,
  ZOOM_STEP,
  clampZoom,
  fitTop,
  fitZoomFor,
  wheelZoomFactor,
} from "./pan-zoom-model.js";
import type { Options, PanZoomLayout } from "./pan-zoom-types.js";
import type { FrameWheel, WheelInput } from "./pan-zoom-wheel-types.js";

const CREATE_LIVE_STORE_100 = 100;

interface Stage {
  w: number;
  h: number;
}

interface View {
  zoom: number;
  x: number;
  y: number;
}

const wheelPixels = (
  wheelInput: WheelInput,
  pageHeight: number
): { dx: number; dy: number } => {
  const unit: number = ((): number => {
    if (wheelInput.deltaMode === 1) {
      return LINE_PX;
    }

    if (wheelInput.deltaMode === 2) {
      return pageHeight;
    }

    return 1;
  })();

  return { dx: wheelInput.deltaX * unit, dy: wheelInput.deltaY * unit };
};

const numericBase = (
  stage: Stage,
  active: Box,
  zoom2: number
): { x: number; y: number } => ({
  x: Math.round((stage.w - active.width * zoom2) / 2),
  y: fitTop(stage.h, active.height * zoom2),
});

const fitBase = (
  stage: Stage,
  layout: PanZoomLayout,
  zoom3: number
): { x: number; y: number } => {
  const { bounds, active } = layout;

  return {
    x:
      Math.round((stage.w - bounds.width * zoom3) / 2) +
      (active.x - bounds.x) * zoom3,
    y: fitTop(stage.h, bounds.height * zoom3) + (active.y - bounds.y) * zoom3,
  };
};

const SCREEN_SIZE_CHROME =
  ".frame-label, .frame-resize, .frame-size-readout, .overlay, .link-layer";

const setZoomVars = (el: HTMLElement, zoom: number): void => {
  el.style.setProperty("--stroke", `${1 / zoom}px`);
  el.style.setProperty("--inv-zoom", String(1 / zoom));
};

const paintScreenSizeChrome = (artboard: HTMLElement, zoom: number): void => {
  for (const el of artboard.querySelectorAll<HTMLElement>(SCREEN_SIZE_CHROME)) {
    if (!el.classList.contains("frame-label")) {
      setZoomVars(el, zoom);
      continue;
    }

    el.style.transform = `scale(${1 / zoom})`;
    el.style.maxWidth = `calc(var(--frame-w, 100000px) * ${zoom})`;
  }
};

interface PanZoom {
  zoom: number;
  zoomPercent: LiveStore<number>;
  panning: boolean;
  spaceHeld: boolean;
  zoomHeld: boolean;
  onPointerDown: (event2: ReactPointerEvent) => void;
  zoomAt: (stageX: number, stageY: number, factor: number) => void;
  zoomTo: (zoom4: number) => void;
  zoomStep: (direction: 1 | -1) => void;
  fit: () => void;
  zoomToActive: () => void;
  freeze: () => void;
  applyZoomKey: (key: ZoomKey) => void;
  frameWheel: (frame: HTMLIFrameElement | null, frameWheel: FrameWheel) => void;
}

const usePanZoom = ({
  stageRef,
  artboardRef,
  layout,
  setting,
  selectionRect,
}: Options): PanZoom => {
  const [stage, setStage] = useState<Stage>({ h: 0, w: 0 });
  const [panning, setPanning] = useState(false);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [zoomHeld, setZoomHeld] = useState(false);
  const [, rerender] = useReducer((count: number) => count + 1, 0);
  const offset = useRef({ x: 0, y: 0 });
  const zoomOverride = useRef<number | null>(null);
  const wheelTimer = useRef<number | null>(null);
  const paintFrame = useRef(0);
  const painted = useRef<View | null>(null);
  const [zoomPercent] = useState(() => createLiveStore(CREATE_LIVE_STORE_100));

  useLayoutEffect(() => {
    const el = stageRef.current;

    if (!el) {
      return;
    }

    const ro = new ResizeObserver(() =>
      setStage({ h: el.clientHeight, w: el.clientWidth })
    );

    ro.observe(el);
    setStage({ h: el.clientHeight, w: el.clientWidth });

    return (): void => ro.disconnect();
  }, [stageRef]);

  const committedZoom: number = ((): number => {
    if (setting === "fit") {
      return fitZoomFor(stage.w, stage.h, layout.bounds);
    }

    return setting;
  })();

  const live = useRef({ committedZoom, layout, selectionRect, setting, stage });
  live.current = { committedZoom, layout, selectionRect, setting, stage };

  const view = useCallback((): View => {
    const cur = live.current;
    const override = zoomOverride.current;
    const zoom = override ?? cur.committedZoom;

    const base: { x: number; y: number } = ((): { x: number; y: number } => {
      if (override === null && cur.setting === "fit") {
        return fitBase(cur.stage, cur.layout, zoom);
      }

      return numericBase(cur.stage, cur.layout.active, zoom);
    })();

    return { x: base.x + offset.current.x, y: base.y + offset.current.y, zoom };
  }, []);

  const paint = useCallback(() => {
    const el = artboardRef.current;

    if (!el) {
      return;
    }

    const view2 = view();
    el.style.transform = `translate(${view2.x}px, ${view2.y}px) scale(${view2.zoom})`;

    if (painted.current?.zoom !== view2.zoom) {
      paintScreenSizeChrome(el, view2.zoom);
    }

    if (
      zoomOverride.current === null &&
      el.style.getPropertyValue("--inv-zoom") !== String(1 / view2.zoom)
    ) {
      setZoomVars(el, view2.zoom);
    }

    painted.current = view2;
    zoomPercent.set(Math.round(view2.zoom * ZOOM_100));
  }, [artboardRef, view, zoomPercent]);

  const schedulePaint = useCallback(() => {
    if (paintFrame.current) {
      return;
    }

    paintFrame.current = requestAnimationFrame(() => {
      paintFrame.current = 0;
      paint();
    });
  }, [paint]);

  useEffect(() => (): void => cancelAnimationFrame(paintFrame.current), []);

  const prevActive = useRef<{ id: string; x: number; y: number } | null>(null);
  const { activeId } = layout;
  const ax = layout.active.x;
  const ay = layout.active.y;
  useLayoutEffect(() => {
    const prev = prevActive.current;
    prevActive.current = { id: activeId, x: ax, y: ay };
    const point = painted.current;

    if (
      !prev ||
      !point ||
      (prev.id === activeId && prev.x === ax && prev.y === ay)
    ) {
      return;
    }

    const cur = live.current;

    if (zoomOverride.current === null && cur.setting === "fit") {
      return;
    }

    const base = numericBase(cur.stage, cur.layout.active, point.zoom);
    offset.current = {
      x: point.x + (ax - prev.x) * point.zoom - base.x,
      y: point.y + (ay - prev.y) * point.zoom - base.y,
    };
  }, [activeId, ax, ay]);

  const fitMode = setting === "fit";
  const { width: aw, height: ah } = layout.active;
  const { x: bx, y: by, width: bw, height: bh } = layout.bounds;
  useLayoutEffect(() => {
    if (fitMode) {
      offset.current = { x: 0, y: 0 };
    }
  }, [fitMode, aw, ah, bx, by, bw, bh]);

  useLayoutEffect(() => paint());

  const commit = useCallback(
    (zoom: ZoomSetting) => {
      if (wheelTimer.current !== null) {
        window.clearTimeout(wheelTimer.current);
      }

      wheelTimer.current = null;
      zoomOverride.current = null;

      const committedZoom2: number = ((): number => {
        if (zoom === "fit") {
          return fitZoomFor(
            live.current.stage.w,
            live.current.stage.h,
            live.current.layout.bounds
          );
        }

        return zoom;
      })();

      live.current = {
        ...live.current,
        committedZoom: committedZoom2,
        setting: zoom,
      };
      paint();
      uiStore.set({ zoom });
    },
    [paint]
  );

  const placeAt = useCallback(
    (stageX: number, stageY: number, factor: number): number => {
      const cur = view();
      const next = clampZoom(cur.zoom * factor);
      const ax0 = (stageX - cur.x) / cur.zoom;
      const ay0 = (stageY - cur.y) / cur.zoom;

      const base = numericBase(
        live.current.stage,
        live.current.layout.active,
        next
      );

      offset.current = {
        x: stageX - ax0 * next - base.x,
        y: stageY - ay0 * next - base.y,
      };

      return next;
    },
    [view]
  );

  const zoomAt = useCallback(
    (stageX: number, stageY: number, factor: number) =>
      commit(placeAt(stageX, stageY, factor)),
    [commit, placeAt]
  );

  const wheelZoomAt = useCallback(
    (stageX: number, stageY: number, factor: number) => {
      zoomOverride.current = placeAt(stageX, stageY, factor);
      schedulePaint();

      if (wheelTimer.current !== null) {
        window.clearTimeout(wheelTimer.current);
      }

      wheelTimer.current = window.setTimeout(() => {
        wheelTimer.current = null;
        const zoom5 = zoomOverride.current;

        if (zoom5 !== null) {
          commit(zoom5);
        }
      }, WHEEL_IDLE_MS);
    },
    [placeAt, schedulePaint, commit]
  );

  const zoomTo = useCallback(
    (zoom6: number) => {
      const { stage: stage2 } = live.current;
      zoomAt(stage2.w / 2, stage2.h / 2, zoom6 / view().zoom);
    },
    [zoomAt, view]
  );

  const zoomStep = useCallback(
    (direction: 1 | -1) => zoomTo(view().zoom * ZOOM_STEP ** direction),
    [zoomTo, view]
  );

  const fit = useCallback(() => {
    offset.current = { x: 0, y: 0 };
    commit("fit");
  }, [commit]);

  const zoomToBox = useCallback(
    (box: Box) => {
      const { stage: stage3, layout: panZoomLayout } = live.current;

      const zoom7 = clampZoom(
        Math.min(
          (stage3.w - SELECTION_PAD * 2) / Math.max(1, box.width),
          (stage3.h - SELECTION_PAD * 2) / Math.max(1, box.height)
        )
      );

      const base = numericBase(stage3, panZoomLayout.active, zoom7);
      offset.current = {
        x: Math.round(stage3.w / 2 - (box.x + box.width / 2) * zoom7) - base.x,
        y: Math.round(stage3.h / 2 - (box.y + box.height / 2) * zoom7) - base.y,
      };
      commit(zoom7);
    },
    [commit]
  );

  const pendingFocus = useRef(false);

  const zoomToActive = useCallback(() => {
    pendingFocus.current = true;
    rerender();
  }, []);

  useLayoutEffect(() => {
    if (!pendingFocus.current) {
      return;
    }

    pendingFocus.current = false;
    const { active } = live.current.layout;
    zoomToBox({ height: active.height, width: active.width, x: 0, y: 0 });
  });

  const freeze = useCallback(() => {
    const cur = live.current;

    if (zoomOverride.current !== null || cur.setting !== "fit") {
      return;
    }

    const view3 = painted.current ?? view();
    const base = numericBase(cur.stage, cur.layout.active, view3.zoom);
    offset.current = { x: view3.x - base.x, y: view3.y - base.y };
    commit(view3.zoom);
  }, [commit, view]);

  const applyZoomKey = useCallback(
    (key: ZoomKey) => {
      if (key === "in") {
        zoomStep(1);
      } else if (key === "out") {
        zoomStep(-1);
      } else if (key === "actual") {
        zoomTo(1);
      } else if (key === "fit") {
        fit();
      } else {
        const { active } = live.current.layout;
        zoomToBox(
          live.current.selectionRect() ?? {
            height: active.height,
            width: active.width,
            x: 0,
            y: 0,
          }
        );
      }
    },
    [zoomStep, zoomTo, fit, zoomToBox]
  );

  const frameOrigin = useRef<{
    frame: HTMLIFrameElement;
    at: number;
    x: number;
    y: number;
    h: number;
  } | null>(null);

  const frameWheel = useCallback(
    (frame: HTMLIFrameElement | null, frameWheel2: FrameWheel) => {
      const el = stageRef.current;

      if (!el || !frame) {
        return;
      }

      const now = performance.now();
      let option = frameOrigin.current;

      if (
        !option ||
        option.frame !== frame ||
        now - option.at > WHEEL_IDLE_MS
      ) {
        const frameRect = frame.getBoundingClientRect();
        const stageRect = el.getBoundingClientRect();
        const view4 = view();
        option = {
          at: now,
          frame,
          h: frame.clientHeight,
          x: (frameRect.left - stageRect.left - view4.x) / view4.zoom,
          y: (frameRect.top - stageRect.top - view4.y) / view4.zoom,
        };
      }

      option.at = now;
      frameOrigin.current = option;
      const view5 = view();
      const { dy } = wheelPixels(frameWheel2, option.h);
      wheelZoomAt(
        view5.x + (option.x + frameWheel2.clientX) * view5.zoom,
        view5.y + (option.y + frameWheel2.clientY) * view5.zoom,
        wheelZoomFactor(dy)
      );
    },
    [stageRef, wheelZoomAt, view]
  );

  useEffect(() => {
    const el = stageRef.current;

    if (!el) {
      return;
    }

    let rect: DOMRect | null = null;
    let height = 0;
    let lastAt = 0;

    const onWheel = (event3: WheelEvent): void => {
      event3.preventDefault();

      if (!rect || event3.timeStamp - lastAt > WHEEL_IDLE_MS) {
        rect = el.getBoundingClientRect();
        height = el.clientHeight;
      }

      lastAt = event3.timeStamp;
      const { dx, dy } = wheelPixels(event3, height);

      if (event3.ctrlKey || event3.metaKey) {
        wheelZoomAt(
          event3.clientX - rect.left,
          event3.clientY - rect.top,
          wheelZoomFactor(dy)
        );
      } else {
        offset.current = { x: offset.current.x - dx, y: offset.current.y - dy };
        schedulePaint();
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });

    return (): void => el.removeEventListener("wheel", onWheel);
  }, [stageRef, wheelZoomAt, schedulePaint]);

  useEffect(() => {
    const down = (event4: KeyboardEvent): void => {
      if (isTypingTarget(event4.target)) {
        return;
      }

      if (event4.code === "Space") {
        event4.preventDefault();

        if (!event4.repeat) {
          setSpaceHeld(true);
        }
      } else if (
        event4.code === "KeyZ" &&
        !event4.metaKey &&
        !event4.ctrlKey &&
        !event4.shiftKey
      ) {
        if (!event4.repeat) {
          setZoomHeld(true);
        }
      }
    };

    const up = (event5: KeyboardEvent): void => {
      if (event5.code === "Space") {
        setSpaceHeld(false);
      }

      if (event5.code === "KeyZ") {
        setZoomHeld(false);
      }
    };

    const blur = (): void => {
      setSpaceHeld(false);
      setZoomHeld(false);
    };

    globalThis.addEventListener("keydown", down);
    globalThis.addEventListener("keyup", up);
    window.addEventListener("blur", blur);

    return (): void => {
      globalThis.removeEventListener("keydown", down);
      globalThis.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);

  const onPointerDown = useCallback(
    (event6: ReactPointerEvent) => {
      if (event6.button === 0 && zoomHeld && !spaceHeld) {
        event6.preventDefault();
        const rect = event6.currentTarget.getBoundingClientRect();

        const argument: number = ((): number => {
          if (event6.altKey) {
            return 1 / CLICK_ZOOM;
          }

          return CLICK_ZOOM;
        })();

        zoomAt(event6.clientX - rect.left, event6.clientY - rect.top, argument);

        return;
      }

      if (!(event6.button === 1 || (event6.button === 0 && spaceHeld))) {
        return;
      }

      event6.preventDefault();
      const target = event6.currentTarget;
      target.setPointerCapture(event6.pointerId);
      setPanning(true);
      let lastX = event6.clientX;
      let lastY = event6.clientY;

      const move = (ev: PointerEvent): void => {
        const dx = ev.clientX - lastX;
        const dy = ev.clientY - lastY;
        lastX = ev.clientX;
        lastY = ev.clientY;

        if (dx === 0 && dy === 0) {
          return;
        }

        offset.current = { x: offset.current.x + dx, y: offset.current.y + dy };
        schedulePaint();
      };

      const end = (): void => {
        setPanning(false);
        rerender();
        target.removeEventListener("pointermove", move as EventListener);
        target.removeEventListener("pointerup", end);
        target.removeEventListener("pointercancel", end);
      };

      target.addEventListener("pointermove", move as EventListener);
      target.addEventListener("pointerup", end);
      target.addEventListener("pointercancel", end);
    },
    [spaceHeld, zoomHeld, zoomAt, schedulePaint]
  );

  return {
    applyZoomKey,
    fit,
    frameWheel,
    freeze,
    onPointerDown,
    panning,
    spaceHeld,
    zoom: zoomOverride.current ?? committedZoom,
    zoomAt,
    zoomHeld,
    zoomPercent,
    zoomStep,
    zoomTo,
    zoomToActive,
  };
};

export { isTypingTarget, usePanZoom };

export type { PanZoom };

export type { Stage };
