import { useEffect, useRef } from 'react';
import type { BridgeToParent, NudgeBase, SelectionContext } from '../shared/contracts';
import { nudgeStepOf } from '../shared/nudge';
import { api, errorText } from './api';
import type { ParentMessageBody } from './bridge';
import { startOptimistic } from './optimisticEdit';
import { buildEditRequest, mergeCommit } from './useDirectEdit';

const SAVE_MS = 300;
const FLOW_HINT = 'Arrow keys move absolute elements and elements with a margin. Drag this one to change its place in the layout.';
const MANY_HINT = 'Select one element to move it with the arrow keys.';

interface Options {
  projectId: string;
  directionId: string | null;
  selection: SelectionContext[];
  enabled: boolean;
  post: (body: ParentMessageBody) => void;
  listen: (handler: (message: BridgeToParent) => void) => () => void;
  setSelection: (updater: (prev: SelectionContext[]) => SelectionContext[]) => void;
  refreshRects: () => void;
  onError: (message: string) => void;
}

interface Burst {
  target: SelectionContext;
  base: NudgeBase;
  dx: number;
  dy: number;
}

const FLUSH_ON = new Set<BridgeToParent['type']>(['ready', 'history-key', 'app-key', 'structure-key', 'reorder-key', 'move-start']);
const shown = new Set<string>();

function axisStyle(prop: string, start: number, delta: number): Record<string, string> {
  return delta === 0 ? {} : { [prop]: `${Math.round(start + delta)}px` };
}

export function nudgeStyle(b: Burst): Record<string, string> {
  const { base, dx, dy } = b;
  if (base.mode === 'margin') return { ...axisStyle('margin-left', base.x, base.lockX ? 0 : dx), ...axisStyle('margin-top', base.y, base.lockY ? 0 : dy) };
  if (base.mode !== 'position') return {};
  return { ...axisStyle(base.fromRight ? 'right' : 'left', base.x, base.fromRight ? -dx : dx), ...axisStyle(base.fromBottom ? 'bottom' : 'top', base.y, base.fromBottom ? -dy : dy) };
}

function movable(base: NudgeBase, dx: number, dy: number): boolean {
  if (base.mode === 'position') return true;
  return base.mode === 'margin' && ((dx !== 0 && !base.lockX) || (dy !== 0 && !base.lockY));
}

function isBodyFocus(): boolean {
  return document.activeElement === document.body || document.activeElement === null;
}

export function useElementNudge(o: Options): void {
  const live = useRef(o);
  live.current = o;
  const burst = useRef<Burst | null>(null);
  const timer = useRef<number | null>(null);
  const flushNow = useRef<() => void>(() => undefined);

  useEffect(() => {
    const hintOnce = (text: string) => {
      if (shown.has(text)) return;
      shown.add(text);
      live.current.onError(text);
    };
    const save = async (b: Burst) => {
      const cur = live.current;
      const style = nudgeStyle(b);
      const req = buildEditRequest(b.target, style);
      if (!req || !cur.directionId) return;
      const selector = b.target.selector;
      cur.setSelection((prev) => mergeCommit(prev, { selector, style }));
      const optimistic = startOptimistic({ post: cur.post, refreshRects: cur.refreshRects }, req, (message) => live.current.onError(message));
      try {
        const result = await api.directEdit(cur.projectId, cur.directionId, req);
        optimistic.saved(result.tailwind);
        live.current.refreshRects();
      } catch (err) {
        optimistic.failed(errorText(err));
        live.current.post({ type: 'preview-reset' });
        const back = Object.fromEntries(Object.keys(style).map((key) => [key, b.target.styles[key] ?? '']));
        live.current.setSelection((prev) => mergeCommit(prev, { selector, style: back }));
        live.current.onError(errorText(err));
      }
    };
    const flush = () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = null;
      const b = burst.current;
      burst.current = null;
      if (b && (b.dx !== 0 || b.dy !== 0)) void save(b);
    };
    const targetFor = (selector: string): SelectionContext | null => {
      const cur = live.current;
      if (!cur.enabled || !cur.directionId) return null;
      if (cur.selection.length > 1) {
        hintOnce(MANY_HINT);
        return null;
      }
      const target = cur.selection[0];
      if (target?.selector !== selector) return null;
      if (!target.source) hintOnce('This element has no source location, so it cannot move here.');
      return target.source ? target : null;
    };
    const press = (selector: string, dx: number, dy: number, base: NudgeBase) => {
      if (burst.current && burst.current.target.selector !== selector) flush();
      const target = targetFor(selector);
      if (!target) return;
      const b = burst.current ?? { target, base, dx: 0, dy: 0 };
      if (!movable(b.base, dx, dy)) return hintOnce(FLOW_HINT);
      b.dx += dx;
      b.dy += dy;
      burst.current = b;
      live.current.post({ type: 'preview-style', selector, style: nudgeStyle(b) });
      live.current.refreshRects();
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(flush, SAVE_MS);
    };
    const onKey = (event: KeyboardEvent) => {
      const step = nudgeStepOf(event);
      if (!step) {
        if (burst.current && event.key !== 'Shift') flush();
        return;
      }
      const cur = live.current;
      if (!cur.enabled || cur.selection.length === 0 || !isBodyFocus()) return;
      event.preventDefault();
      cur.post({ type: 'nudge', dx: step.dx, dy: step.dy });
    };
    flushNow.current = flush;
    const stop = o.listen((message) => {
      if (message.type === 'nudge-key') press(message.selector, message.dx, message.dy, message.base);
      else if (FLUSH_ON.has(message.type)) flush();
    });
    window.addEventListener('keydown', onKey, true);
    return () => {
      stop();
      window.removeEventListener('keydown', onKey, true);
      flush();
    };
  }, [o.listen]);

  const key = o.selection.map((s) => s.selector).join('\n');
  useEffect(() => {
    if (burst.current && key !== burst.current.target.selector) flushNow.current();
  }, [key]);
}
