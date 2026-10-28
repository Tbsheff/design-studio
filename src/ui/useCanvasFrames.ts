import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import { zoomKeyOf, type ProjectKind, type SelectionContext, type ZoomKey } from '../shared/contracts';
import { activeFrame, addFrame, canvasStore, defaultLayout, followDirection, moveFrame, removeFrame, resizeActive, useCanvasLayout, viewportOf, type Box, type CanvasFrame, type CanvasLayout } from './canvasFrames';
import { snapOff, snapRect } from './snap';
import { useDesktopCommand } from './desktop';
import { uiStore, useUi } from './storage';
import { blocksZoomKey, type PanZoom } from './usePanZoom';
import type { FilesChange } from './useStudioData';
import { frameSnapStore, otherFrames, useFrameResize } from './useFrameResize';

const ZOOM_ECHO_MS = 150;
const DRAG_THRESHOLD = 3;

type ZoomSource = 'key' | 'frame' | 'menu';

export function unionRect(selection: SelectionContext[]): Box | null {
  if (selection.length === 0) return null;
  const left = Math.min(...selection.map((s) => s.rect.x));
  const top = Math.min(...selection.map((s) => s.rect.y));
  const right = Math.max(...selection.map((s) => s.rect.x + s.rect.width));
  const bottom = Math.max(...selection.map((s) => s.rect.y + s.rect.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

export function passiveSrc(baseUrl: string | null, kind: ProjectKind, change: FilesChange | null): string | null {
  if (!baseUrl) return null;
  if (kind !== 'html' || !change) return baseUrl;
  const url = new URL(baseUrl, window.location.href);
  url.searchParams.set('v', String(change.changedAt));
  return url.toString();
}

export interface CanvasFrames {
  layout: CanvasLayout;
  active: CanvasFrame;
  update: (fn: (layout: CanvasLayout) => CanvasLayout) => void;
  activate: (frame: CanvasFrame) => void;
}

export function useCanvasFrames(projectId: string, directionId: string | null = null, onDirection?: (id: string) => void, knownIds?: string[]): CanvasFrames {
  const { viewport } = useUi();
  const [layout, update] = useCanvasLayout(projectId, viewport);
  const active = activeFrame(layout);
  const synced = useRef<{ pid: string; w: number; h: number } | null>(null);
  useLayoutEffect(() => {
    const prev = synced.current;
    synced.current = { pid: projectId, w: viewport.width, h: viewport.height };
    if (!prev || prev.pid !== projectId) {
      if (active.width !== viewport.width || active.height !== viewport.height) uiStore.set({ viewport: viewportOf(active) });
      return;
    }
    if (prev.w !== viewport.width || prev.h !== viewport.height) update((l) => resizeActive(l, viewport.width, viewport.height));
  });
  useLayoutEffect(() => {
    if (!directionId) return;
    const current = canvasStore.get(projectId) ?? defaultLayout(viewport);
    const bound = activeFrame(current).directionId;
    if (bound && knownIds && !knownIds.includes(bound)) return;
    const next = followDirection(current, directionId);
    if (next === current) return;
    canvasStore.set(projectId, next);
    const a = activeFrame(next);
    if (a.width !== viewport.width || a.height !== viewport.height) uiStore.set({ viewport: viewportOf(a) });
  }, [projectId, directionId, layout]);
  const activate = (frame: CanvasFrame) => {
    if (frame.id === layout.activeId) return;
    update((l) => ({ ...l, activeId: frame.id }));
    uiStore.set({ viewport: viewportOf(frame) });
    if (frame.directionId && frame.directionId !== directionId) onDirection?.(frame.directionId);
  };
  return { layout, active, update, activate };
}

export function useZoomInput(apply: (key: ZoomKey) => void): (key: ZoomKey, from: ZoomSource) => void {
  const lastZoom = useRef<{ key: ZoomKey; source: ZoomSource; at: number } | null>(null);
  const zoomBy = useCallback(
    (key: ZoomKey, from: ZoomSource) => {
      const now = performance.now();
      const last = lastZoom.current;
      if (last && last.key === key && last.source !== from && now - last.at < ZOOM_ECHO_MS) return;
      lastZoom.current = { key, source: from, at: now };
      apply(key);
    },
    [apply],
  );
  useDesktopCommand((command) => {
    if (command.type !== 'zoom') return false;
    zoomBy(command.key, 'menu');
    return true;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = zoomKeyOf(e);
      if (!key || blocksZoomKey(e)) return;
      e.preventDefault();
      zoomBy(key, 'key');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoomBy]);
  return zoomBy;
}

function snapMove(state: DragState, candidates: Box[], wx: number, wy: number, off: boolean): { x: number; y: number } {
  if (off || candidates.length === 0) {
    frameSnapStore.set(null);
    return { x: wx, y: wy };
  }
  const f = state.frame;
  const res = snapRect({ rect: { x: f.x + wx, y: f.y + wy, width: f.width, height: f.height }, candidates, zoom: state.zoom, x: 'move', y: 'move' });
  const sx = res.rect.x - f.x;
  const sy = res.rect.y - f.y;
  frameSnapStore.set({ guides: res.guides, spacing: res.spacing, shift: state.isActive ? { x: -sx, y: -sy } : { x: 0, y: 0 } });
  return { x: sx, y: sy };
}

interface DragState {
  frame: CanvasFrame;
  isActive: boolean;
  zoom: number;
  passive: HTMLDivElement[];
  own: HTMLDivElement | null;
}

function placeDrag(state: DragState, artboard: HTMLDivElement | null, dx: number, dy: number): void {
  const wx = dx / state.zoom;
  const wy = dy / state.zoom;
  const clear = dx === 0 && dy === 0;
  if (state.isActive) {
    if (artboard) artboard.style.translate = clear ? '' : `${dx}px ${dy}px`;
    for (const el of state.passive) el.style.translate = clear ? '' : `${-wx}px ${-wy}px`;
  } else if (state.own) {
    state.own.style.translate = clear ? '' : `${wx}px ${wy}px`;
  }
}

export function useFrameActions(frames: CanvasFrames, pz: PanZoom, artboardRef: RefObject<HTMLDivElement | null>) {
  const { layout } = frames;
  const passiveRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const registerPassive = useCallback((id: string, el: HTMLDivElement | null) => {
    passiveRefs.current[id] = el;
  }, []);

  const addFrameAt = (size: { width: number; height: number }) => {
    pz.freeze();
    frames.update((l) => addFrame(l, size));
  };

  const [removed, setRemoved] = useState<CanvasLayout | null>(null);
  const removeFrameAt = (frame: CanvasFrame) => {
    pz.freeze();
    const next = removeFrame(layout, frame.id);
    setRemoved(layout);
    frames.update(() => next);
    if (frame.id === layout.activeId) uiStore.set({ viewport: viewportOf(activeFrame(next)) });
  };
  const undoRemove = removed
    ? () => {
        frames.update(() => removed);
        uiStore.set({ viewport: viewportOf(activeFrame(removed)) });
        setRemoved(null);
      }
    : null;
  const dismissUndo = useCallback(() => setRemoved(null), []);

  const nudge = (frame: CanvasFrame, dx: number, dy: number) => {
    pz.freeze();
    frames.update((l) => moveFrame(l, frame.id, dx, dy));
  };

  const onFramePointerDown = (e: ReactPointerEvent, frame: CanvasFrame) => {
    if (e.button !== 0 || pz.spaceHeld || pz.zoomHeld) return;
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    const state: DragState = {
      frame,
      isActive: frame.id === layout.activeId,
      zoom: pz.zoom,
      passive: Object.values(passiveRefs.current).filter((el): el is HTMLDivElement => el !== null),
      own: passiveRefs.current[frame.id] ?? null,
    };
    const startX = e.clientX;
    const startY = e.clientY;
    const candidates = otherFrames(layout, frame.id);
    let moved = false;
    let world = { x: 0, y: 0 };
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      if (!moved) document.body.classList.add('frame-dragging');
      moved = true;
      world = snapMove(state, candidates, dx / state.zoom, dy / state.zoom, snapOff(ev));
      placeDrag(state, artboardRef.current, world.x * state.zoom, world.y * state.zoom);
    };
    const end = () => {
      target.removeEventListener('pointermove', move as EventListener);
      target.removeEventListener('pointerup', end);
      target.removeEventListener('pointercancel', end);
      document.body.classList.remove('frame-dragging');
      frameSnapStore.set(null);
      placeDrag(state, artboardRef.current, 0, 0);
      if (!moved) {
        frames.activate(frame);
        return;
      }
      pz.freeze();
      frames.update((l) => moveFrame(l, frame.id, world.x, world.y));
    };
    target.addEventListener('pointermove', move as EventListener);
    target.addEventListener('pointerup', end);
    target.addEventListener('pointercancel', end);
  };

  const onResizeStart = useFrameResize(frames, pz, artboardRef, passiveRefs);
  const labelProps = (frame: CanvasFrame) => ({
    frame,
    active: frame.id === layout.activeId,
    removable: layout.frames.length > 1,
    directionId: null as string | null,
    onPointerDown: onFramePointerDown,
    onActivate: frames.activate,
    onRemove: removeFrameAt,
    onNudge: nudge,
    onResizeStart,
  });

  return { labelProps, registerPassive, addFrameAt, undoRemove, dismissUndo, onResizeStart };
}
