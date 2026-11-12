import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { RefObject } from "react";

import { createLiveStore } from "../../platform/live-store.js";
import type { LiveStore } from "../../platform/live-store.js";
import {
  HOVER_DELAY_MS,
  KEEP_MARGIN,
  NEAR_MARGIN,
  NO_BUDGET,
  isFrameLive,
  toHoverState,
  toNearState,
} from "./frame-still-model.js";
import type { FrameLiveSources } from "./frame-still-model.js";

interface FrameLive {
  readonly isKept: boolean;
  readonly isLive: boolean;
  readonly isNear: boolean;
  readonly onPointerEnter: () => void;
  readonly onPointerLeave: () => void;
}

const toSources = (zoomPercent: LiveStore<number>): FrameLiveSources => ({
  budget: createLiveStore(NO_BUDGET),
  stills: {
    asked: new Set(),
    changes: createLiveStore(0),
    jobs: [],
    latest: new Map(),
    running: new Set(),
    urls: new Map(),
  },
  zoomPercent,
});

const useFrameLiveSources = (
  zoomPercent: LiveStore<number>
): FrameLiveSources => useMemo(() => toSources(zoomPercent), [zoomPercent]);

const useIntersecting = (
  box: RefObject<HTMLDivElement | null>,
  margin: string,
  onChange: (isIntersecting: boolean) => void
): void => {
  useEffect(() => {
    const el = box.current;

    if (!el) {
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        const last = entries.at(-1);

        if (last) {
          onChange(last.isIntersecting);
        }
      },
      { root: el.closest(".stage"), rootMargin: margin }
    );

    io.observe(el);

    return (): void => io.disconnect();
  }, [box, margin, onChange]);
};

const useBudgetNear = (
  sources: FrameLiveSources,
  id: string,
  isNear: boolean
): void => {
  useEffect(() => {
    const { budget } = sources;
    budget.set(toNearState(budget.get(), id, isNear));

    return (): void => {
      budget.set(toNearState(budget.get(), id, false));
      budget.set(toHoverState(budget.get(), id, false));
    };
  }, [id, isNear, sources]);
};

const useHoverIntent = (
  sources: FrameLiveSources,
  id: string
): Pick<FrameLive, "onPointerEnter" | "onPointerLeave"> => {
  const timer = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);

  const clearTimer = useCallback((): void => {
    if (timer.current !== null) {
      globalThis.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const onPointerEnter = useCallback((): void => {
    clearTimer();
    timer.current = globalThis.setTimeout(() => {
      timer.current = null;
      sources.budget.set(toHoverState(sources.budget.get(), id, true));
    }, HOVER_DELAY_MS);
  }, [clearTimer, id, sources]);

  const onPointerLeave = useCallback((): void => {
    clearTimer();
    sources.budget.set(toHoverState(sources.budget.get(), id, false));
  }, [clearTimer, id, sources]);

  useEffect(() => clearTimer, [clearTimer]);

  return { onPointerEnter, onPointerLeave };
};

const useIsLive = (sources: FrameLiveSources, id: string): boolean => {
  const { budget, zoomPercent } = sources;

  const subscribe = useCallback(
    (listener: () => void): (() => void) => {
      const stopBudget = budget.subscribe(listener);
      const stopZoom = zoomPercent.subscribe(listener);

      return (): void => {
        stopBudget();
        stopZoom();
      };
    },
    [budget, zoomPercent]
  );

  const read = useCallback(
    (): boolean => isFrameLive(budget.get(), zoomPercent.get(), id),
    [budget, id, zoomPercent]
  );

  return useSyncExternalStore(subscribe, read, read);
};

const useFrameLive = (
  box: RefObject<HTMLDivElement | null>,
  sources: FrameLiveSources,
  id: string
): FrameLive => {
  const [isNear, setIsNear] = useState(false);
  const [isKept, setIsKept] = useState(false);

  useIntersecting(box, NEAR_MARGIN, setIsNear);
  useIntersecting(box, KEEP_MARGIN, setIsKept);
  useBudgetNear(sources, id, isNear);

  const hover = useHoverIntent(sources, id);
  const isLive = useIsLive(sources, id);

  return { ...hover, isKept, isLive, isNear };
};

export { useFrameLive, useFrameLiveSources };

export type { FrameLive };
