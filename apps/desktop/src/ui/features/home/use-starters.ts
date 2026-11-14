import type { Starter } from "@design-studio/contracts";
import { useEffect, useMemo } from "react";

import { api } from "../../api.js";
import { createLiveStore, useLive } from "../../platform/live-store.js";

const MAX_STARTERS = 4;

const starterStore = createLiveStore<Starter[] | null>(null);

const runStarterRead = async (): Promise<void> => {
  try {
    starterStore.set(await api.starters());
  } catch {
    starterStore.set(null);
  }
};

const useStarters = (): Starter[] => {
  const list = useLive(starterStore);

  useEffect(() => {
    if (starterStore.get() === null) {
      runStarterRead();
    }
  }, []);

  return useMemo(() => (list ?? []).slice(0, MAX_STARTERS), [list]);
};

export { useStarters };
