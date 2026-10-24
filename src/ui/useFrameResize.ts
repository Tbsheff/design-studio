import { useRef, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import { activeFrame, RESIZE_MIN, resizeFrame, viewportOf, type CanvasFrame } from './canvasFrames';
import type { ResizeEdge } from './components/FrameControls';
import { uiStore } from './storage';
import type { CanvasFrames } from './useCanvasFrames';
import type { PanZoom } from './usePanZoom';

const MAX_SIDE = 4000;

export function resizedSize(start: { width: number; height: number }, edge: ResizeEdge, dx: number, dy: number, keepRatio: boolean): { width: number; height: number } {
  const clamp = (v: number) => Math.round(Math.min(MAX_SIDE, Math.max(RESIZE_MIN, v)));
  let width = edge === 'bottom' ? start.width : start.width + dx;
  let height = edge === 'right' ? start.height : start.height + dy;
  if (keepRatio) {
    const ratio = start.width / start.height;
    if (edge === 'bottom') width = height * ratio;
    else if (edge === 'right') height = width / ratio;
    else if (Math.abs(dx) * start.height >= Math.abs(dy) * start.width) height = width / ratio;
    else width = height * ratio;
    const scale = Math.max(1, RESIZE_MIN / width, RESIZE_MIN / height);
    width *= scale;
    height *= scale;
  }
  return { width: clamp(width), height: clamp(height) };
}

function paintSize(host: HTMLElement, size: { width: number; height: number } | null, restore: { width: string; height: string }) {
  host.style.width = size ? `${size.width}px` : restore.width;
  host.style.height = size ? `${size.height}px` : restore.height;
  for (const frame of host.querySelectorAll<HTMLIFrameElement>(':scope > iframe')) {
    frame.style.width = size ? `${size.width}px` : '';
    frame.style.height = size ? `${size.height}px` : '';
  }
  const readout = host.querySelector<HTMLElement>(':scope > .frame-size-readout');
  if (readout) readout.textContent = size ? `${size.width} × ${size.height}` : '';
  host.classList.toggle('frame-resizing', size !== null);
}

export function useFrameResize(frames: CanvasFrames, pz: PanZoom, artboardRef: RefObject<HTMLDivElement | null>, passive: RefObject<Record<string, HTMLDivElement | null>>) {
  const dragging = useRef(false);
  return (e: ReactPointerEvent, frame: CanvasFrame, edge: ResizeEdge) => {
    if (e.button !== 0 || pz.spaceHeld || pz.zoomHeld || dragging.current) return;
    e.preventDefault();
    e.stopPropagation();
    const host = frame.id === frames.layout.activeId ? artboardRef.current : (passive.current?.[frame.id] ?? null);
    if (!host) return;
    pz.freeze();
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    dragging.current = true;
    const zoom = pz.zoom;
    const startX = e.clientX;
    const startY = e.clientY;
    const start = { width: frame.width, height: frame.height };
    let size = start;
    let shift = e.shiftKey;
    let last = { x: startX, y: startY };
    const restore = { width: host.style.width, height: host.style.height };
    document.body.classList.add(`frame-resize-${edge}`);
    const place = () => {
      size = resizedSize(start, edge, (last.x - startX) / zoom, (last.y - startY) / zoom, shift);
      paintSize(host, size, restore);
    };
    place();
    const move = (ev: PointerEvent) => {
      last = { x: ev.clientX, y: ev.clientY };
      shift = ev.shiftKey;
      place();
    };
    const key = (ev: KeyboardEvent) => {
      if (ev.key !== 'Shift') return;
      shift = ev.type === 'keydown';
      place();
    };
    const end = () => {
      target.removeEventListener('pointermove', move as EventListener);
      target.removeEventListener('pointerup', end);
      target.removeEventListener('pointercancel', end);
      window.removeEventListener('keydown', key);
      window.removeEventListener('keyup', key);
      document.body.classList.remove(`frame-resize-${edge}`);
      dragging.current = false;
      paintSize(host, null, restore);
      if (size.width === start.width && size.height === start.height) return;
      frames.update((l) => resizeFrame(l, frame.id, size.width, size.height));
      if (frame.id === frames.layout.activeId) {
        const next = activeFrame(resizeFrame(frames.layout, frame.id, size.width, size.height));
        uiStore.set({ viewport: viewportOf(next) });
      }
    };
    target.addEventListener('pointermove', move as EventListener);
    target.addEventListener('pointerup', end);
    target.addEventListener('pointercancel', end);
    window.addEventListener('keydown', key);
    window.addEventListener('keyup', key);
  };
}
