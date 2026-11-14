import type { Starter } from "@design-studio/contracts";
import { useEffect, useMemo } from "react";

import { api } from "../../api.js";
import { createLiveStore, useLive } from "../../platform/live-store.js";

const MAX_STARTERS = 4;

const starterStore = createLiveStore<Starter[] | null>(null);

const viewers = new Set<symbol>();

const runStarterRead = async (): Promise<void> => {
  try {
    const list = await api.starters();

    if (viewers.size > 0) {
      starterStore.set(list);
    }
  } catch {
    starterStore.set(null);
  }
};

const useStarterList = (): readonly Starter[] | null => {
  const list = useLive(starterStore);

  useEffect(() => {
    const viewer = Symbol("starters");

    viewers.add(viewer);

    if (starterStore.get() === null) {
      runStarterRead();
    }

    return (): void => {
      viewers.delete(viewer);

      if (viewers.size === 0) {
        starterStore.set(null);
      }
    };
  }, []);

  return list;
};

const useStarters = (): Starter[] => {
  const list = useStarterList();

  return useMemo(() => (list ?? []).slice(0, MAX_STARTERS), [list]);
};

export { useStarterList, useStarters };
