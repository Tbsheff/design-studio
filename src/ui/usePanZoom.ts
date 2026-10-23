import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import { zoomKeyOf, type ZoomKey } from '../shared/contracts';
import { uiStore, type ZoomSetting } from './storage';

const PAD = 24;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 1.25;
const LINE_PX = 16;
const WHEEL_RATE = 0.01;

interface WheelInput {
  deltaX: number;
  deltaY: number;
  deltaMode: number;
}

interface FrameWheel extends WheelInput {
  clientX: number;
  clientY: number;
}

function wheelPixels(e: WheelInput, pageHeight: number): { dx: number; dy: number } {
  const unit = e.deltaMode === 1 ? LINE_PX : e.deltaMode === 2 ? pageHeight : 1;
  return { dx: e.deltaX * unit, dy: e.deltaY * unit };
}

function wheelZoomFactor(dy: number): number {
  return Math.min(2, Math.max(0.5, Math.exp(-dy * WHEEL_RATE)));
}

function clampZoom(z: number): number {
  return Math.round(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z)) * 10000) / 10000;
}

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

interface PanZoom {
  zoom: number;
  x: number;
  y: number;
  panning: boolean;
  spaceHeld: boolean;
  onPointerDown: (e: ReactPointerEvent) => void;
  zoomAt: (stageX: number, stageY: number, factor: number) => void;
  zoomTo: (z: number) => void;
  zoomStep: (direction: 1 | -1) => void;
  fit: () => void;
  applyZoomKey: (key: ZoomKey) => void;
  frameWheel: (frame: HTMLIFrameElement | null, e: FrameWheel) => void;
}

export function usePanZoom(
  stageRef: RefObject<HTMLDivElement | null>,
  width: number,
  height: number,
  setting: ZoomSetting,
): PanZoom {
  const [stage, setStage] = useState({ w: 0, h: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const [spaceHeld, setSpaceHeld] = useState(false);

  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setStage({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setStage({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, [stageRef]);

  const fitZoom =
    stage.w > 0 && stage.h > 0
      ? Math.max(MIN_ZOOM, Math.min(1, (stage.w - PAD * 2) / width, (stage.h - PAD * 2) / height))
      : 1;
  const zoom = setting === 'fit' ? fitZoom : setting;

  const center = useCallback(
    (z: number) => ({
      x: Math.round((stage.w - width * z) / 2),
      y: Math.max(PAD, Math.round((stage.h - height * z) / 2)),
    }),
    [stage.w, stage.h, width, height],
  );

  useEffect(() => {
    if (setting === 'fit') setOffset({ x: 0, y: 0 });
  }, [setting, width, height]);

  const base = center(zoom);
  const x = base.x + offset.x;
  const y = base.y + offset.y;

  const live = useRef({ zoom, x, y, center, stage });
  live.current = { zoom, x, y, center, stage };

  const zoomAt = useCallback((stageX: number, stageY: number, factor: number) => {
    const cur = live.current;
    const next = clampZoom(cur.zoom * factor);
    const ax = (stageX - cur.x) / cur.zoom;
    const ay = (stageY - cur.y) / cur.zoom;
    const nx = stageX - ax * next;
    const ny = stageY - ay * next;
    const c = cur.center(next);
    live.current = { ...cur, zoom: next, x: nx, y: ny };
    setOffset({ x: nx - c.x, y: ny - c.y });
    uiStore.set({ zoom: next });
  }, []);

  const zoomTo = useCallback(
    (z: number) => {
      const cur = live.current;
      zoomAt(cur.stage.w / 2, cur.stage.h / 2, z / cur.zoom);
    },
    [zoomAt],
  );

  const zoomStep = useCallback((direction: 1 | -1) => zoomTo(live.current.zoom * ZOOM_STEP ** direction), [zoomTo]);

  const fit = useCallback(() => {
    setOffset({ x: 0, y: 0 });
    uiStore.set({ zoom: 'fit' });
  }, []);

  const applyZoomKey = useCallback(
    (key: ZoomKey) => {
      if (key === '=') zoomStep(1);
      else if (key === '-') zoomStep(-1);
      else if (key === '0') fit();
      else zoomTo(1);
    },
    [zoomStep, zoomTo, fit],
  );

  const frameWheel = useCallback(
    (frame: HTMLIFrameElement | null, e: FrameWheel) => {
      const el = stageRef.current;
      if (!el || !frame) return;
      const frameRect = frame.getBoundingClientRect();
      const stageRect = el.getBoundingClientRect();
      const z = live.current.zoom;
      const { dy } = wheelPixels(e, frame.clientHeight);
      zoomAt(frameRect.left - stageRect.left + e.clientX * z, frameRect.top - stageRect.top + e.clientY * z, wheelZoomFactor(dy));
    },
    [stageRef, zoomAt],
  );

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { dx, dy } = wheelPixels(e, el.clientHeight);
      if (e.ctrlKey || e.metaKey) {
        const rect = el.getBoundingClientRect();
        zoomAt(e.clientX - rect.left, e.clientY - rect.top, wheelZoomFactor(dy));
      } else {
        setOffset((o) => ({ x: o.x - dx, y: o.y - dy }));
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [stageRef, zoomAt]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = zoomKeyOf(e);
      if (!key || (isTypingTarget(e.target) && !(e.target instanceof HTMLSelectElement))) return;
      e.preventDefault();
      applyZoomKey(key);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [applyZoomKey]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isTypingTarget(e.target)) {
        e.preventDefault();
        setSpaceHeld(true);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpaceHeld(false);
    };
    const blur = () => setSpaceHeld(false);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, []);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      if (!(e.button === 1 || (e.button === 0 && spaceHeld))) return;
      e.preventDefault();
      const target = e.currentTarget;
      target.setPointerCapture(e.pointerId);
      setPanning(true);
      let lastX = e.clientX;
      let lastY = e.clientY;
      const move = (ev: PointerEvent) => {
        const dx = ev.clientX - lastX;
        const dy = ev.clientY - lastY;
        lastX = ev.clientX;
        lastY = ev.clientY;
        if (dx !== 0 || dy !== 0) setOffset((o) => ({ x: o.x + dx, y: o.y + dy }));
      };
      const end = () => {
        setPanning(false);
        target.removeEventListener('pointermove', move as EventListener);
        target.removeEventListener('pointerup', end);
        target.removeEventListener('pointercancel', end);
      };
      target.addEventListener('pointermove', move as EventListener);
      target.addEventListener('pointerup', end);
      target.addEventListener('pointercancel', end);
    },
    [spaceHeld],
  );

  return { zoom, x, y, panning, spaceHeld, onPointerDown, zoomAt, zoomTo, zoomStep, fit, applyZoomKey, frameWheel };
}
