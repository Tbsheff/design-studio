import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useConversation } from '../ai/components/ai/conversation';

const FIRST = 12;
const STEP = 16;
const NEAR_TOP_PX = 800;

interface HistoryWindow<T> {
  shown: T[];
  hidden: number;
  more: () => void;
}

interface WindowState {
  reset: string | null;
  count: number;
  last: string | null;
}

interface Item {
  key: string;
  at: number;
}

const CLOCK_SLACK_MS = 5000;

function nextCount(state: WindowState, items: readonly Item[], since: number): number {
  const last = items.at(-1)?.key ?? null;
  if (state.last === null || last === state.last) return state.count;
  const at = items.findLastIndex((item) => item.key === state.last);
  if (at === -1) return state.count;
  const live = items.slice(at + 1).filter((item) => item.at >= since - CLOCK_SLACK_MS).length;
  return state.count + live;
}

export function useHistoryWindow<T extends Item>(items: T[], resetKey: string | null, all: boolean): HistoryWindow<T> {
  const { viewportRef } = useConversation();
  const [since] = useState(() => Date.now());
  const [state, setState] = useState<WindowState>({ reset: resetKey, count: FIRST, last: null });
  const last = items.at(-1)?.key ?? null;
  const count = state.reset === resetKey ? nextCount(state, items, since) : FIRST;
  if (state.reset !== resetKey) setState({ reset: resetKey, count: FIRST, last: null });
  else if (state.last !== last) setState({ ...state, count, last });
  const start = all ? 0 : Math.max(0, items.length - count);
  const fromBottom = useRef<number | null>(null);
  const more = useCallback(() => {
    const v = viewportRef.current;
    if (v) fromBottom.current = v.scrollHeight - v.scrollTop;
    setState((prev) => ({ ...prev, count: prev.count + STEP }));
  }, [viewportRef]);
  useLayoutEffect(() => {
    const v = viewportRef.current;
    if (!v || fromBottom.current === null) return;
    v.scrollTop = v.scrollHeight - fromBottom.current;
    fromBottom.current = null;
  }, [start, viewportRef]);
  return { shown: start > 0 ? items.slice(start) : items, hidden: start, more };
}

export function EarlierRuns({ hidden, onMore }: { hidden: number; onMore: () => void }) {
  const { viewportRef, wasAtBottomRef } = useConversation();
  const ref = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    const root = viewportRef.current;
    if (!el || !root || hidden === 0) return;
    let frame = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        if (wasAtBottomRef.current || !entries.some((entry) => entry.isIntersecting)) return;
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(onMore);
      },
      { root, rootMargin: `${NEAR_TOP_PX}px 0px 0px 0px` },
    );
    observer.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [hidden, onMore, viewportRef, wasAtBottomRef]);
  if (hidden === 0) return null;
  return (
    <button ref={ref} type="button" className="btn ghost small chat-earlier" onClick={onMore}>
      Show {hidden} earlier {hidden === 1 ? 'run' : 'runs'}
    </button>
  );
}
