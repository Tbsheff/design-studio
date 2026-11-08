import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { ReactElement } from "react";

import { useConversation } from "../../ai/components/ai/conversation.js";
import { requestOlderRuns, useOlderRuns } from "./run-history-model.js";

const FIRST = 12;
const STEP = 16;
const NEAR_TOP_PX = 800;

interface HistoryWindow<Entry> {
  shown: Entry[];
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

const nextCount = (
  state: WindowState,
  items: readonly Item[],
  since: number
): number => {
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
    .filter((item) => item.at >= since - CLOCK_SLACK_MS).length;

  return state.count + live;
};

const useHistoryWindow = <Entry extends Item>(
  items: Entry[],
  resetKey: string | null,
  reveal: string | null
): HistoryWindow<Entry> => {
  const { viewportRef } = useConversation();
  const [since] = useState(() => Date.now());

  const [state, setState] = useState<WindowState>({
    count: FIRST,
    last: null,
    reset: resetKey,
  });

  const last = items.at(-1)?.key ?? null;

  const count =
    state.reset === resetKey ? nextCount(state, items, since) : FIRST;

  if (state.reset !== resetKey) {
    setState({ count: FIRST, last: null, reset: resetKey });
  } else if (state.last !== last) {
    setState({ ...state, count, last });
  }

  const revealAt =
    reveal === null ? -1 : items.findIndex((item) => item.key === reveal);

  const need = revealAt === -1 ? 0 : items.length - revealAt;

  if (need > count && state.reset === resetKey) {
    setState((prev) => ({ ...prev, count: Math.max(prev.count, need) }));
  }

  const start = Math.max(0, items.length - Math.max(count, need));
  const fromBottom = useRef<number | null>(null);
  const shortBy = start - STEP;

  const more = useCallback(() => {
    const viewport = viewportRef.current;

    if (viewport) {
      fromBottom.current = viewport.scrollHeight - viewport.scrollTop;
    }

    setState((prev) => ({ ...prev, count: prev.count + STEP }));

    if (shortBy <= 0) {
      requestOlderRuns();
    }
  }, [viewportRef, shortBy]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport || fromBottom.current === null) {
      return;
    }

    viewport.scrollTop = viewport.scrollHeight - fromBottom.current;
    fromBottom.current = null;
  }, [start, items.length, viewportRef]);

  return { hidden: start, more, shown: start > 0 ? items.slice(start) : items };
};

const EarlierRuns = ({
  hidden,
  onMore,
}: {
  hidden: number;
  onMore: () => void;
}): ReactElement | null => {
  const { viewportRef, wasAtBottomRef } = useConversation();
  const ref = useRef<HTMLButtonElement | null>(null);
  const older = useOlderRuns();
  const shown = hidden > 0 || older.more;
  useEffect(() => {
    const el = ref.current;
    const root = viewportRef.current;

    if (!el || !root || !shown || older.loading) {
      return;
    }

    let frame = 0;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          wasAtBottomRef.current ||
          !entries.some((entry) => entry.isIntersecting)
        ) {
          return;
        }

        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(onMore);
      },
      { root, rootMargin: `${NEAR_TOP_PX}px 0px 0px 0px` }
    );

    observer.observe(el);

    return (): void => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [hidden, shown, older.loading, onMore, viewportRef, wasAtBottomRef]);

  if (!shown) {
    return null;
  }

  return (
    <button
      ref={ref}
      type="button"
      className="btn ghost small chat-earlier"
      onClick={onMore}
    >
      {hidden > 0
        ? `Show ${hidden} earlier ${hidden === 1 ? "run" : "runs"}`
        : older.loading
          ? "Loading earlier runs"
          : "Show earlier runs"}
    </button>
  );
};

export { EarlierRuns, useHistoryWindow };
