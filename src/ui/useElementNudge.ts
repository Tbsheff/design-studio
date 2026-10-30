import { useEffect, useRef } from 'react';
import type { BridgeToParent, DirectEditRequest, NudgeBase, NudgeItem, SelectionContext } from '../shared/contracts';
import { nudgeStepOf } from '../shared/nudge';
import { api, errorText } from './api';
import type { ParentMessageBody } from './bridge';
import { startOptimistic } from './optimisticEdit';
import { multiBlockReason } from './mixedValues';
import { buildEditRequest, mergeCommit } from './useDirectEdit';

const SAVE_MS = 300;
const FLOW_HINT = 'Arrow keys move absolute elements and elements with a margin. Drag this one to change its place in the layout.';
const NO_SOURCE_HINT = 'This element has no source location, so it cannot move here.';
const SOME_HINT = 'Some selected elements sit in the layout, so the arrow keys move only the others. Drag one to change its place.';

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

interface Mover {
  target: SelectionContext;
  base: NudgeBase;
}

interface Burst {
  key: string;
  items: Mover[];
  dx: number;
  dy: number;
}

interface Step {
  base: NudgeBase;
  dx: number;
  dy: number;
}

const FLUSH_ON = new Set<BridgeToParent['type']>(['ready', 'history-key', 'app-key', 'structure-key', 'reorder-key', 'move-start']);
const shown = new Set<string>();

function axisStyle(prop: string, start: number, delta: number): Record<string, string> {
  return delta === 0 ? {} : { [prop]: `${Math.round(start + delta)}px` };
}

export function nudgeStyle(b: Step): Record<string, string> {
  const { base, dx, dy } = b;
  if (base.mode === 'margin') return { ...axisStyle('margin-left', base.x, base.lockX ? 0 : dx), ...axisStyle('margin-top', base.y, base.lockY ? 0 : dy) };
  if (base.mode !== 'position') return {};
  return { ...axisStyle(base.fromRight ? 'right' : 'left', base.x, base.fromRight ? -dx : dx), ...axisStyle(base.fromBottom ? 'bottom' : 'top', base.y, base.fromBottom ? -dy : dy) };
}

function movable(base: NudgeBase, dx: number, dy: number): boolean {
  if (base.mode === 'position') return true;
  return base.mode === 'margin' && ((dx !== 0 && !base.lockX) || (dy !== 0 && !base.lockY));
}

function burstKey(selectors: string[]): string {
  return [...selectors].sort().join('\n');
}

interface Saved {
  edit: DirectEditRequest;
  selector: string;
  style: Record<string, string>;
  back: Record<string, string>;
}

function savedOf(b: Burst): Saved[] {
  return b.items.flatMap((item) => {
    const style = nudgeStyle({ base: item.base, dx: b.dx, dy: b.dy });
    const edit = buildEditRequest(item.target, style);
    if (!edit) return [];
    const back = Object.fromEntries(Object.keys(style).map((key) => [key, item.target.styles[key] ?? '']));
    return [{ edit, selector: item.target.selector, style, back }];
  });
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
    const restore = (list: Saved[], message: string) => {
      live.current.post({ type: 'preview-reset' });
      for (const one of list) live.current.setSelection((prev) => mergeCommit(prev, { selector: one.selector, style: one.back }));
      live.current.onError(message);
    };
    const save = async (b: Burst) => {
      const cur = live.current;
      const list = savedOf(b);
      if (list.length === 0 || !cur.directionId) return;
      for (const one of list) cur.setSelection((prev) => mergeCommit(prev, { selector: one.selector, style: one.style }));
      const port = { post: cur.post, refreshRects: cur.refreshRects };
      const optimistic = list.map((one) => startOptimistic(port, one.edit, (message) => live.current.onError(message)));
      try {
        if (list.length === 1) {
          const result = await api.directEdit(cur.projectId, cur.directionId, (list[0] as Saved).edit);
          optimistic[0]?.saved(result.tailwind);
        } else {
          const result = await api.directEditBatch(cur.projectId, cur.directionId, { edits: list.map((one) => one.edit) });
          optimistic.forEach((one, index) => one.saved(result.applied[index]?.tailwind));
        }
        live.current.refreshRects();
      } catch (err) {
        for (const one of optimistic) one.failed(errorText(err));
        restore(list, errorText(err));
      }
    };
    const flush = () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = null;
      const b = burst.current;
      burst.current = null;
      if (b && (b.dx !== 0 || b.dy !== 0)) void save(b);
    };
    const moversFor = (wanted: NudgeItem[]): Mover[] | null => {
      const cur = live.current;
      if (!cur.enabled || !cur.directionId) return null;
      const picked = wanted.flatMap((item) => {
        const target = cur.selection.find((s) => s.selector === item.selector);
        return target ? [{ target, base: item.base }] : [];
      });
      if (picked.length === 0) return null;
      const reason = picked.length > 1 ? multiBlockReason(picked.map((item) => item.target)) : picked[0]?.target.source ? null : NO_SOURCE_HINT;
      if (reason) hintOnce(reason);
      return reason ? null : picked;
    };
    const begin = (wanted: NudgeItem[], key: string): Burst | null => {
      const all = moversFor(wanted);
      if (!all) return null;
      const items = all.filter((item) => item.base.mode !== 'none');
      if (items.length < all.length) hintOnce(items.length === 0 ? FLOW_HINT : SOME_HINT);
      return items.length === 0 ? null : { key, items, dx: 0, dy: 0 };
    };
    const press = (wanted: NudgeItem[], dx: number, dy: number) => {
      const key = burstKey(wanted.map((item) => item.selector));
      if (burst.current && burst.current.key !== key) flush();
      const b = burst.current ?? begin(wanted, key);
      if (!b) return;
      if (!b.items.some((item) => movable(item.base, dx, dy))) return hintOnce(FLOW_HINT);
      b.dx += dx;
      b.dy += dy;
      burst.current = b;
      for (const item of b.items) live.current.post({ type: 'preview-style', selector: item.target.selector, style: nudgeStyle({ base: item.base, dx: b.dx, dy: b.dy }) });
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
      if (message.type === 'nudge-key') press([{ selector: message.selector, base: message.base }, ...(message.others ?? [])], message.dx, message.dy);
      else if (FLUSH_ON.has(message.type)) flush();
    });
    window.addEventListener('keydown', onKey, true);
    return () => {
      stop();
      window.removeEventListener('keydown', onKey, true);
      flush();
    };
  }, [o.listen]);

  const key = burstKey(o.selection.map((s) => s.selector));
  useEffect(() => {
    if (burst.current && key !== burst.current.key) flushNow.current();
  }, [key]);
}
