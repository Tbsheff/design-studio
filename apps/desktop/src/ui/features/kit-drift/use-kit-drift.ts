import { useCallback, useMemo, useTransition } from "react";

import { kitDriftRoutes, useAction } from "./deps.js";
import { toHighIds } from "./kit-drift-model.js";
import type { KitDriftView } from "./kit-drift-model.js";

interface KitDriftSetup {
  readonly directionId: string | null;
  readonly projectId: string;
}

interface KitDrift {
  readonly error: string | null;
  readonly handleSwap: (id: string) => void;
  readonly handleSwapAll: () => void;
  readonly hasHigh: boolean;
  readonly isBusy: boolean;
  readonly isLoading: boolean;
  readonly items: readonly KitDriftView[];
}

const LIST_LIMIT = 200;

const useKitDrift = (setup: KitDriftSetup): KitDrift => {
  const { directionId, projectId } = setup;
  const [isWorking, startWork] = useTransition();

  const input = useMemo(() => {
    if (directionId === null) {
      return null;
    }

    const cursor = null;
    const limit = LIST_LIMIT;
    const page = null;

    return { cursor, directionId, limit, page, projectId };
  }, [directionId, projectId]);

  const list = useAction(kitDriftRoutes.listKitDrift, input);
  const swapper = useAction(kitDriftRoutes.applyKitDrift);
  const { run } = swapper;
  const items = useMemo(() => list.data?.items ?? [], [list.data]);
  const highIds = useMemo(() => toHighIds(items), [items]);

  const swapIds = useCallback(
    (found: readonly string[]) => {
      if (directionId === null || found.length === 0) {
        return;
      }

      const ids = [...found];

      startWork(async () => {
        await run({ directionId, ids, projectId });
      });
    },
    [directionId, projectId, run]
  );

  const handleSwap = useCallback((id: string) => swapIds([id]), [swapIds]);
  const handleSwapAll = useCallback(() => swapIds(highIds), [highIds, swapIds]);
  const error = swapper.error?.message ?? list.error?.message ?? null;
  const hasHigh = highIds.length > 0;
  const isBusy = isWorking || swapper.pending;
  const isLoading = list.loading;

  return {
    error,
    handleSwap,
    handleSwapAll,
    hasHigh,
    isBusy,
    isLoading,
    items,
  };
};

export { useKitDrift };

export type { KitDrift, KitDriftSetup };
