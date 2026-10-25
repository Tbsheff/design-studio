import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { SelectionContext } from '../shared/contracts';
import { api, errorText } from './api';
import type { ParentMessageBody } from './bridge';
import { buildEditRequest, mergeCommit } from './useDirectEdit';

export type ResizeEdge = 'e' | 's' | 'se';

interface Size {
  w: number;
  h: number;
}

interface Options {
  projectId: string;
  directionId: string | null;
  selection: SelectionContext[];
  enabled: boolean;
  post: (body: ParentMessageBody) => void;
  holdSwap?: (held: boolean, settle: boolean) => void;
  setSelection: (updater: (prev: SelectionContext[]) => SelectionContext[]) => void;
  refreshRects: () => void;
  onError: (message: string) => void;
}

interface Drag {
  edge: ResizeEdge;
  pointerId: number;
  startX: number;
  startY: number;
  zoom: number;
  base: Size;
  size: Size;
  target: SelectionContext;
  axes: Set<'width' | 'height'>;
}

export interface ResizeLive {
  width: number;
  height: number;
  boxWidth: number;
  boxHeight: number;
}

export interface ResizeControl {
  target: SelectionContext | null;
  live: ResizeLive | null;
  onHandleDown: (edge: ResizeEdge, e: ReactPointerEvent<HTMLElement>) => void;
}

function pxOf(value: string | undefined, fallback: number): number {
  const parsed = value?.endsWith('px') ? Number.parseFloat(value) : Number.NaN;
  return Math.round(Number.isFinite(parsed) ? parsed : fallback);
}

function scaleOf(element: Element): number {
  const overlay = element.closest<HTMLElement>('.overlay');
  if (!overlay || overlay.offsetWidth === 0) return 1;
  return overlay.getBoundingClientRect().width / overlay.offsetWidth;
}

export function resizedSize(edge: ResizeEdge, base: Size, dx: number, dy: number, keepRatio: boolean): Size {
  let w = edge === 's' ? base.w : base.w + dx;
  let h = edge === 'e' ? base.h : base.h + dy;
  if (keepRatio && base.w > 0 && base.h > 0) {
    const ratio = base.w / base.h;
    if (edge === 'e') h = w / ratio;
    else if (edge === 's') w = h * ratio;
    else if (Math.abs(dx / base.w) >= Math.abs(dy / base.h)) h = w / ratio;
    else w = h * ratio;
  }
  return { w: Math.max(1, Math.round(w)), h: Math.max(1, Math.round(h)) };
}

function axisStyle(d: Drag, size: Size): Record<string, string> {
  const style: Record<string, string> = {};
  if (d.axes.has('width')) style.width = `${size.w}px`;
  if (d.axes.has('height')) style.height = `${size.h}px`;
  return style;
}

function styleFor(size: Size, base: Size): Record<string, string> {
  const style: Record<string, string> = {};
  if (size.w !== base.w) style.width = `${size.w}px`;
  if (size.h !== base.h) style.height = `${size.h}px`;
  return style;
}

export function useResizeHandles(o: Options): ResizeControl {
  const live = useRef(o);
  live.current = o;
  const drag = useRef<Drag | null>(null);
  const [size, setSize] = useState<{ size: Size; base: Size } | null>(null);
  const target = o.enabled && o.selection.length === 1 && o.selection[0]?.source ? (o.selection[0] ?? null) : null;

  const preview = useCallback((d: Drag, next: Size, keepRatio: boolean) => {
    d.size = next;
    if (d.edge !== 's' || keepRatio) d.axes.add('width');
    if (d.edge !== 'e' || keepRatio) d.axes.add('height');
    setSize({ size: next, base: d.base });
    live.current.post({ type: 'preview-style', selector: d.target.selector, style: axisStyle(d, next) });
  }, []);

  const end = useCallback((committing = false) => {
    drag.current = null;
    setSize(null);
    document.body.classList.remove('element-resizing');
    live.current.holdSwap?.(false, !committing);
  }, []);

  const cancel = useCallback(() => {
    const d = drag.current;
    if (!d) return;
    live.current.post({ type: 'preview-style', selector: d.target.selector, style: axisStyle(d, d.base) });
    end();
  }, [end]);

  const commit = useCallback(async (d: Drag) => {
    const cur = live.current;
    const style = styleFor(d.size, d.base);
    const req = buildEditRequest(d.target, style);
    if (!req || !cur.directionId) return;
    const selector = d.target.selector;
    cur.setSelection((prev) => mergeCommit(prev, { selector, style }));
    try {
      await api.directEdit(cur.projectId, cur.directionId, req);
      live.current.refreshRects();
    } catch (err) {
      const back = { width: d.target.styles.width ?? '', height: d.target.styles.height ?? '' };
      live.current.setSelection((prev) => mergeCommit(prev, { selector, style: back }));
      live.current.post({ type: 'preview-style', selector, style: axisStyle(d, d.base) });
      live.current.onError(errorText(err));
    }
  }, []);

  const onHandleDown = useCallback(
    (edge: ResizeEdge, e: ReactPointerEvent<HTMLElement>) => {
      const sel = target;
      if (e.button !== 0 || !sel) return;
      e.preventDefault();
      e.stopPropagation();
      const handle = e.currentTarget;
      handle.setPointerCapture(e.pointerId);
      const base = { w: pxOf(sel.styles.width, sel.rect.width), h: pxOf(sel.styles.height, sel.rect.height) };
      const d: Drag = { edge, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, zoom: scaleOf(handle) || 1, base, size: base, target: sel, axes: new Set() };
      drag.current = d;
      document.body.classList.add('element-resizing');
      live.current.holdSwap?.(true, false);
      setSize({ size: base, base });
      const onMove = (ev: PointerEvent) => {
        if (ev.pointerId !== d.pointerId || drag.current !== d) return;
        preview(d, resizedSize(d.edge, d.base, (ev.clientX - d.startX) / d.zoom, (ev.clientY - d.startY) / d.zoom, ev.shiftKey), ev.shiftKey);
      };
      const detach = () => {
        handle.removeEventListener('pointermove', onMove);
        handle.removeEventListener('pointerup', onUp);
        handle.removeEventListener('pointercancel', onCancel);
        window.removeEventListener('keydown', onKey, true);
      };
      const onUp = (ev: PointerEvent) => {
        if (ev.pointerId !== d.pointerId) return;
        detach();
        if (drag.current !== d) return;
        const changed = d.size.w !== d.base.w || d.size.h !== d.base.h;
        end(changed);
        if (changed) void commit(d);
      };
      const onCancel = () => {
        detach();
        cancel();
      };
      const onKey = (ev: KeyboardEvent) => {
        if (ev.key !== 'Escape') return;
        ev.preventDefault();
        ev.stopPropagation();
        onCancel();
      };
      handle.addEventListener('pointermove', onMove);
      handle.addEventListener('pointerup', onUp);
      handle.addEventListener('pointercancel', onCancel);
      window.addEventListener('keydown', onKey, true);
    },
    [target, preview, end, cancel, commit],
  );

  useEffect(() => () => cancel(), [cancel]);

  const liveBox =
    size && target
      ? { width: size.size.w, height: size.size.h, boxWidth: target.rect.width + size.size.w - size.base.w, boxHeight: target.rect.height + size.size.h - size.base.h }
      : null;
  return { target, live: liveBox, onHandleDown };
}
