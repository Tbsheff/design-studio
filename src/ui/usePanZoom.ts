import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import { isModZoomKey, zoomKeyOf, type ZoomKey } from '../shared/contracts';
import type { Box } from './canvasFrames';
import { uiStore, type ZoomSetting } from './storage';
import { isTypingTarget } from './typingTarget';

export { isTypingTarget };

const PAD = 24;
const SELECTION_PAD = 64;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 1.25;
const LINE_PX = 16;
const WHEEL_RATE = 0.01;
const WHEEL_IDLE_MS = 160;
const CLICK_ZOOM = 2;

interface WheelInput {
  deltaX: number;
  deltaY: number;
  deltaMode: number;
}

interface FrameWheel extends WheelInput {
  clientX: number;
  clientY: number;
}

export interface PanZoomLayout {
  activeId: string;
  active: Box;
  bounds: Box;
}

interface Stage {
  w: number;
  h: number;
}

interface View {
  zoom: number;
  x: number;
  y: number;
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

function fitZoomFor(stage: Stage, bounds: Box): number {
  if (stage.w <= 0 || stage.h <= 0 || bounds.width <= 0 || bounds.height <= 0) return 1;
  return Math.max(MIN_ZOOM, Math.min(1, (stage.w - PAD * 2) / bounds.width, (stage.h - PAD * 2) / bounds.height));
}

function numericBase(stage: Stage, active: Box, z: number): { x: number; y: number } {
  return { x: Math.round((stage.w - active.width * z) / 2), y: Math.max(PAD, Math.round((stage.h - active.height * z) / 2)) };
}

function fitBase(stage: Stage, layout: PanZoomLayout, z: number): { x: number; y: number } {
  const { bounds, active } = layout;
  return {
    x: Math.round((stage.w - bounds.width * z) / 2) + (active.x - bounds.x) * z,
    y: Math.max(PAD, Math.round((stage.h - bounds.height * z) / 2)) + (active.y - bounds.y) * z,
  };
}

export function blocksZoomKey(event: KeyboardEvent): boolean {
  if (!isTypingTarget(event.target)) return false;
  return !(isModZoomKey(event) && event.target instanceof HTMLSelectElement);
}

interface Options {
  stageRef: RefObject<HTMLDivElement | null>;
  artboardRef: RefObject<HTMLDivElement | null>;
  layout: PanZoomLayout;
  setting: ZoomSetting;
  selectionRect: () => Box | null;
}

export interface PanZoom {
  zoom: number;
  panning: boolean;
  spaceHeld: boolean;
  zoomHeld: boolean;
  onPointerDown: (e: ReactPointerEvent) => void;
  zoomAt: (stageX: number, stageY: number, factor: number) => void;
  zoomTo: (z: number) => void;
  zoomStep: (direction: 1 | -1) => void;
  fit: () => void;
  freeze: () => void;
  applyZoomKey: (key: ZoomKey) => void;
  frameWheel: (frame: HTMLIFrameElement | null, e: FrameWheel) => void;
}

export function usePanZoom({ stageRef, artboardRef, layout, setting, selectionRect }: Options): PanZoom {
  const [stage, setStage] = useState<Stage>({ w: 0, h: 0 });
  const [panning, setPanning] = useState(false);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [zoomHeld, setZoomHeld] = useState(false);
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const offset = useRef({ x: 0, y: 0 });
  const zoomOverride = useRef<number | null>(null);
  const wheelTimer = useRef<number | null>(null);
  const paintFrame = useRef(0);
  const painted = useRef<View | null>(null);

  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setStage({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setStage({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, [stageRef]);

  const committedZoom = setting === 'fit' ? fitZoomFor(stage, layout.bounds) : setting;
  const live = useRef({ stage, layout, setting, committedZoom, selectionRect });
  live.current = { stage, layout, setting, committedZoom, selectionRect };

  const view = useCallback((): View => {
    const cur = live.current;
    const override = zoomOverride.current;
    const zoom = override ?? cur.committedZoom;
    const base = override === null && cur.setting === 'fit' ? fitBase(cur.stage, cur.layout, zoom) : numericBase(cur.stage, cur.layout.active, zoom);
    return { zoom, x: base.x + offset.current.x, y: base.y + offset.current.y };
  }, []);

  const paint = useCallback(() => {
    const el = artboardRef.current;
    if (!el) return;
    const v = view();
    el.style.transform = `translate(${v.x}px, ${v.y}px) scale(${v.zoom})`;
    el.style.setProperty('--stroke', `${1 / v.zoom}px`);
    el.style.setProperty('--inv-zoom', String(1 / v.zoom));
    painted.current = v;
  }, [artboardRef, view]);

  const schedulePaint = useCallback(() => {
    if (paintFrame.current) return;
    paintFrame.current = requestAnimationFrame(() => {
      paintFrame.current = 0;
      paint();
    });
  }, [paint]);

  useEffect(() => () => cancelAnimationFrame(paintFrame.current), []);

  const prevActive = useRef<{ id: string; x: number; y: number } | null>(null);
  const { activeId } = layout;
  const ax = layout.active.x;
  const ay = layout.active.y;
  useLayoutEffect(() => {
    const prev = prevActive.current;
    prevActive.current = { id: activeId, x: ax, y: ay };
    const p = painted.current;
    if (!prev || !p || (prev.id === activeId && prev.x === ax && prev.y === ay)) return;
    const cur = live.current;
    if (zoomOverride.current === null && cur.setting === 'fit') return;
    const base = numericBase(cur.stage, cur.layout.active, p.zoom);
    offset.current = { x: p.x + (ax - prev.x) * p.zoom - base.x, y: p.y + (ay - prev.y) * p.zoom - base.y };
  }, [activeId, ax, ay]);

  const fitMode = setting === 'fit';
  const { width: aw, height: ah } = layout.active;
  const { x: bx, y: by, width: bw, height: bh } = layout.bounds;
  useLayoutEffect(() => {
    if (fitMode) offset.current = { x: 0, y: 0 };
  }, [fitMode, aw, ah, bx, by, bw, bh]);

  useLayoutEffect(() => paint());

  const commit = useCallback((zoom: ZoomSetting) => {
    if (wheelTimer.current !== null) window.clearTimeout(wheelTimer.current);
    wheelTimer.current = null;
    zoomOverride.current = null;
    live.current = { ...live.current, setting: zoom, committedZoom: zoom === 'fit' ? fitZoomFor(live.current.stage, live.current.layout.bounds) : zoom };
    paint();
    uiStore.set({ zoom });
  }, [paint]);

  const placeAt = useCallback((stageX: number, stageY: number, factor: number): number => {
    const cur = view();
    const next = clampZoom(cur.zoom * factor);
    const ax0 = (stageX - cur.x) / cur.zoom;
    const ay0 = (stageY - cur.y) / cur.zoom;
    const base = numericBase(live.current.stage, live.current.layout.active, next);
    offset.current = { x: stageX - ax0 * next - base.x, y: stageY - ay0 * next - base.y };
    return next;
  }, [view]);

  const zoomAt = useCallback((stageX: number, stageY: number, factor: number) => commit(placeAt(stageX, stageY, factor)), [commit, placeAt]);

  const wheelZoomAt = useCallback(
    (stageX: number, stageY: number, factor: number) => {
      zoomOverride.current = placeAt(stageX, stageY, factor);
      schedulePaint();
      if (wheelTimer.current !== null) window.clearTimeout(wheelTimer.current);
      wheelTimer.current = window.setTimeout(() => {
        wheelTimer.current = null;
        const z = zoomOverride.current;
        if (z !== null) commit(z);
      }, WHEEL_IDLE_MS);
    },
    [placeAt, schedulePaint, commit],
  );

  const zoomTo = useCallback(
    (z: number) => {
      const { stage: s } = live.current;
      zoomAt(s.w / 2, s.h / 2, z / view().zoom);
    },
    [zoomAt, view],
  );

  const zoomStep = useCallback((direction: 1 | -1) => zoomTo(view().zoom * ZOOM_STEP ** direction), [zoomTo, view]);

  const fit = useCallback(() => {
    offset.current = { x: 0, y: 0 };
    commit('fit');
  }, [commit]);

  const zoomToBox = useCallback(
    (box: Box) => {
      const { stage: s, layout: l } = live.current;
      const z = clampZoom(Math.min((s.w - SELECTION_PAD * 2) / Math.max(1, box.width), (s.h - SELECTION_PAD * 2) / Math.max(1, box.height)));
      const base = numericBase(s, l.active, z);
      offset.current = { x: Math.round(s.w / 2 - (box.x + box.width / 2) * z) - base.x, y: Math.round(s.h / 2 - (box.y + box.height / 2) * z) - base.y };
      commit(z);
    },
    [commit],
  );

  const freeze = useCallback(() => {
    const cur = live.current;
    if (zoomOverride.current !== null || cur.setting !== 'fit') return;
    const v = painted.current ?? view();
    const base = numericBase(cur.stage, cur.layout.active, v.zoom);
    offset.current = { x: v.x - base.x, y: v.y - base.y };
    commit(v.zoom);
  }, [commit, view]);

  const applyZoomKey = useCallback(
    (key: ZoomKey) => {
      if (key === 'in') zoomStep(1);
      else if (key === 'out') zoomStep(-1);
      else if (key === 'actual') zoomTo(1);
      else if (key === 'fit') fit();
      else {
        const { active } = live.current.layout;
        zoomToBox(live.current.selectionRect() ?? { x: 0, y: 0, width: active.width, height: active.height });
      }
    },
    [zoomStep, zoomTo, fit, zoomToBox],
  );

  const frameWheel = useCallback(
    (frame: HTMLIFrameElement | null, e: FrameWheel) => {
      const el = stageRef.current;
      if (!el || !frame) return;
      const frameRect = frame.getBoundingClientRect();
      const stageRect = el.getBoundingClientRect();
      const z = view().zoom;
      const { dy } = wheelPixels(e, frame.clientHeight);
      wheelZoomAt(frameRect.left - stageRect.left + e.clientX * z, frameRect.top - stageRect.top + e.clientY * z, wheelZoomFactor(dy));
    },
    [stageRef, wheelZoomAt, view],
  );

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { dx, dy } = wheelPixels(e, el.clientHeight);
      if (e.ctrlKey || e.metaKey) {
        const rect = el.getBoundingClientRect();
        wheelZoomAt(e.clientX - rect.left, e.clientY - rect.top, wheelZoomFactor(dy));
      } else {
        offset.current = { x: offset.current.x - dx, y: offset.current.y - dy };
        schedulePaint();
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [stageRef, wheelZoomAt, schedulePaint]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (!e.repeat) setSpaceHeld(true);
      } else if (e.code === 'KeyZ' && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
        if (!e.repeat) setZoomHeld(true);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpaceHeld(false);
      if (e.code === 'KeyZ') setZoomHeld(false);
    };
    const blur = () => {
      setSpaceHeld(false);
      setZoomHeld(false);
    };
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
      if (e.button === 0 && zoomHeld && !spaceHeld) {
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        zoomAt(e.clientX - rect.left, e.clientY - rect.top, e.altKey ? 1 / CLICK_ZOOM : CLICK_ZOOM);
        return;
      }
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
        if (dx === 0 && dy === 0) return;
        offset.current = { x: offset.current.x + dx, y: offset.current.y + dy };
        schedulePaint();
      };
      const end = () => {
        setPanning(false);
        rerender();
        target.removeEventListener('pointermove', move as EventListener);
        target.removeEventListener('pointerup', end);
        target.removeEventListener('pointercancel', end);
      };
      target.addEventListener('pointermove', move as EventListener);
      target.addEventListener('pointerup', end);
      target.addEventListener('pointercancel', end);
    },
    [spaceHeld, zoomHeld, zoomAt, schedulePaint],
  );

  return {
    zoom: zoomOverride.current ?? committedZoom,
    panning,
    spaceHeld,
    zoomHeld,
    onPointerDown,
    zoomAt,
    zoomTo,
    zoomStep,
    fit,
    freeze,
    applyZoomKey,
    frameWheel,
  };
}
