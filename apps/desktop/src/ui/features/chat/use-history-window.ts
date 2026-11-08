import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { RefObject } from "react";

import { requestOlderRuns } from "./run-history-model.js";

const FIRST = 12;
const STEP = 16;

interface HistoryWindow<Entry> {
  shown: Entry[];
  hidden: number;
  more: () => void;
}

interface WindowState {
  reset: string | null;
  count: number;
  last: string | null;
  since: number;
}

interface Item {
  key: string;
  at: number;
}

const CLOCK_SLACK_MS = 5000;

const nextCount = (state: WindowState, items: readonly Item[]): number => {
  const last = items.at(-1)?.key ?? null;

  if (state.last === null || last === state.last) {
    return state.count;
  }

  const at = items.findLastIndex((item) => item.key === state.last);

  if (at === -1) {
    return state.count;
  }

  const live = items
    .slice(at + 1)
    .filter((item) => item.at >= state.since - CLOCK_SLACK_MS).length;

  return state.count + live;
};

const toRevealNeed = (
  items: readonly Item[],
  reveal: string | null
): number => {
  if (reveal === null) {
    return 0;
  }

  const revealAt = items.findIndex((item) => item.key === reveal);

  if (revealAt === -1) {
    return 0;
  }

  return items.length - revealAt;
};

const useScrollAnchor = (
  viewportRef: RefObject<HTMLElement | null>
): (() => void) => {
  const fromBottom = useRef<number | null>(null);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport || fromBottom.current === null) {
      return;
    }

    viewport.scrollTop = viewport.scrollHeight - fromBottom.current;
    fromBottom.current = null;
  });

  return useCallback(() => {
    const viewport = viewportRef.current;

    if (viewport) {
      fromBottom.current = viewport.scrollHeight - viewport.scrollTop;
    }
  }, [viewportRef]);
};

const useHistoryWindow = <Entry extends Item>(
  items: Entry[],
  resetKey: string | null,
  reveal: string | null,
  viewportRef: RefObject<HTMLElement | null>
): HistoryWindow<Entry> => {
  const [state, setState] = useState<WindowState>(() => ({
    count: FIRST,
    last: null,
    reset: resetKey,
    since: Date.now(),
  }));

  const last = items.at(-1)?.key ?? null;
  let count: number = FIRST;

  if (state.reset === resetKey) {
    count = nextCount(state, items);
  }

  if (state.reset !== resetKey) {
    setState({ ...state, count: FIRST, last: null, reset: resetKey });
  }

  if (state.reset === resetKey && state.last !== last) {
    setState({ ...state, count, last });
  }

  const need = toRevealNeed(items, reveal);

  if (need > count && state.reset === resetKey) {
    setState((prev) => ({ ...prev, count: Math.max(prev.count, need) }));
  }

  const start = Math.max(0, items.length - Math.max(count, need));
  const shortBy = start - STEP;
  const markScroll = useScrollAnchor(viewportRef);

  const more = useCallback(() => {
    markScroll();
    setState((prev) => ({ ...prev, count: prev.count + STEP }));

    if (shortBy <= 0) {
      requestOlderRuns();
    }
  }, [markScroll, shortBy]);

  let shown = items;

  if (start > 0) {
    shown = items.slice(start);
  }

  return { hidden: start, more, shown };
};

export { useHistoryWindow };
