import { useEffect, useRef, useState } from 'react';
import type { BridgeToParent, FreeMoveDrag, FreeMoveLine, FreeMoveStart, SelectionContext, StructureEditRequest } from '../shared/contracts';
import { api, errorText } from './api';
import type { ParentMessageBody } from './bridge';
import { startOptimistic } from './optimisticEdit';
import { snapRect, type Rect, type SnapGuide, type SpacingBadge } from './snap';
import { selectionTargets } from './structureEdits';
import { buildEditRequest, mergeCommit } from './useDirectEdit';
import { createLiveStore, type LiveStore } from './liveStore';

export interface FreeMoveView {
  box: Rect;
  guides: SnapGuide[];
  spacing: SpacingBadge[];
  line: FreeMoveLine | null;
  copy: boolean;
}

interface Options {
  projectId: string;
  directionId: string | null;
  selection: SelectionContext[];
  enabled: boolean;
  busy: boolean;
  zoom: number;
  post: (body: ParentMessageBody) => void;
  listen: (handler: (message: BridgeToParent) => void) => () => void;
  holdSwap?: (held: boolean, settle: boolean) => void;
  setSelection: (updater: (prev: SelectionContext[]) => SelectionContext[]) => void;
  refreshRects: () => void;
  onError: (message: string) => void;
  applyStructure: (request: StructureEditRequest) => Promise<void>;
}

interface Session {
  start: FreeMoveStart;
  target: SelectionContext;
  candidates: Rect[];
}

interface Placed {
  dx: number;
  dy: number;
  view: FreeMoveView;
}

function place(s: Session, drag: FreeMoveDrag, zoom: number): Placed {
  const base = s.start.rect;
  const moved = { ...base, x: base.x + drag.dx, y: base.y + drag.dy };
  const absolute = s.start.mode === 'absolute';
  const snapped = !absolute || drag.free || s.candidates.length === 0 ? { rect: moved, guides: [], spacing: [] } : snapRect({ rect: moved, candidates: s.candidates, zoom, x: 'move', y: 'move' });
  const box = snapped.rect;
  return {
    dx: Math.round(box.x - base.x),
    dy: Math.round(box.y - base.y),
    view: { box, guides: snapped.guides, spacing: snapped.spacing, line: drag.insert?.line ?? null, copy: drag.alt },
  };
}

function transformOf(s: Session, dx: number, dy: number): string {
  const own = s.start.transform && s.start.transform !== 'none' ? ` ${s.start.transform}` : '';
  return `translate(${dx}px, ${dy}px)${own}`;
}

function absoluteStyle(s: Session, dx: number, dy: number): Record<string, string> {
  const style: Record<string, string> = {};
  const { fromRight, fromBottom } = s.start;
  if (dx !== 0 || s.start.convert) style[fromRight ? 'right' : 'left'] = `${Math.round(s.start.left + (fromRight ? -dx : dx))}px`;
  if (dy !== 0 || s.start.convert) style[fromBottom ? 'bottom' : 'top'] = `${Math.round(s.start.top + (fromBottom ? -dy : dy))}px`;
  if (s.start.convert) Object.assign(style, { position: 'absolute', width: `${Math.round(s.start.rect.width)}px` });
  return style;
}

export function useFreeMove(o: Options): LiveStore<FreeMoveView | null> {
  const live = useRef(o);
  live.current = o;
  const session = useRef<Session | null>(null);
  const [view] = useState(() => createLiveStore<FreeMoveView | null>(null));
  const setView = view.set;

  useEffect(() => {
    const end = (committing: boolean) => {
      if (!session.current) return;
      session.current = null;
      setView(null);
      document.body.classList.remove('element-moving');
      window.removeEventListener('keydown', onKey, true);
      live.current.post({ type: 'preview-reset' });
      live.current.holdSwap?.(false, !committing);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !session.current) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      live.current.post({ type: 'move-cancel' });
      end(false);
    };
    const begin = (start: FreeMoveStart) => {
      const cur = live.current;
      const target = cur.selection.length === 1 ? cur.selection[0] : undefined;
      if (!cur.enabled || !cur.directionId || !target?.source || target.selector !== start.selector) {
        cur.post({ type: 'move-cancel' });
        if (cur.enabled && !target?.source && target?.selector === start.selector) cur.onError('This element has no source location, so it cannot move here.');
        return;
      }
      session.current = { start, target, candidates: start.parent ? [start.parent, ...start.siblings] : start.siblings };
      document.body.classList.add('element-moving');
      window.addEventListener('keydown', onKey, true);
      cur.holdSwap?.(true, false);
      setView({ box: start.rect, guides: [], spacing: [], line: null, copy: false });
    };
    const update = (drag: FreeMoveDrag) => {
      const s = session.current;
      if (!s) return;
      const placed = place(s, drag, live.current.zoom);
      live.current.post({ type: 'preview-style', selector: s.start.selector, style: { transform: drag.alt ? transformOf(s, 0, 0) : transformOf(s, placed.dx, placed.dy) } });
      setView(placed.view);
    };
    const drop = (drag: FreeMoveDrag) => {
      const s = session.current;
      if (!s) return;
      const placed = place(s, drag, live.current.zoom);
      const write = commitPlan(s, drag, placed);
      end(write !== null);
      if (write) void write();
    };
    const commitPlan = (s: Session, drag: FreeMoveDrag, placed: Placed): (() => Promise<void>) | null => {
      const cur = live.current;
      if (drag.note || cur.busy) {
        if (drag.note || drag.insert || placed.dx !== 0 || placed.dy !== 0) cur.onError(drag.note ?? 'Wait for the last edit to finish.');
        return null;
      }
      const target = selectionTargets([s.target])?.[0];
      if (!target) return null;
      if (s.start.mode === 'flow') {
        const ref = drag.insert?.ref;
        if (!ref) return null;
        const self = drag.insert?.self ? { ...drag.insert.self, selector: target.selector } : target;
        return () => cur.applyStructure({ op: drag.alt ? 'duplicate' : 'move', targets: [self], ...(drag.insert?.after ? { after: ref } : { before: ref }) });
      }
      if (placed.dx === 0 && placed.dy === 0) return null;
      const style = absoluteStyle(s, placed.dx, placed.dy);
      if (drag.alt) return () => cur.applyStructure({ op: 'duplicate', targets: [target], style });
      return () => saveStyle(s.target, style);
    };
    const saveStyle = async (target: SelectionContext, style: Record<string, string>) => {
      const cur = live.current;
      const req = buildEditRequest(target, style);
      if (!req || !cur.directionId) return;
      const selector = target.selector;
      cur.setSelection((prev) => mergeCommit(prev, { selector, style }));
      const optimistic = startOptimistic({ post: cur.post, refreshRects: cur.refreshRects }, req, (message) => live.current.onError(message));
      try {
        const result = await api.directEdit(cur.projectId, cur.directionId, req);
        optimistic.saved(result.tailwind);
        live.current.refreshRects();
      } catch (err) {
        optimistic.failed(errorText(err));
        const back = Object.fromEntries(Object.keys(style).map((key) => [key, target.styles[key] ?? '']));
        live.current.setSelection((prev) => mergeCommit(prev, { selector, style: back }));
        live.current.onError(errorText(err));
      }
    };
    const stop = o.listen((message) => {
      if (message.type === 'move-start') begin(message.move);
      else if (message.type === 'move-live') update(message.drag);
      else if (message.type === 'move-drop') drop(message.drag);
      else if (message.type === 'move-cancel' || message.type === 'ready') end(false);
    });
    return () => {
      stop();
      end(false);
    };
  }, [o.listen]);

  return view;
}
