import { useCallback, useEffect, useState } from "react";

import { PENDING_MS } from "./layers-constants.js";

interface PendingSelectApi {
  readonly pending: number | null;
  readonly select: (id: number, isAdditive: boolean) => void;
  readonly shown: number | null;
}

const usePendingSelect = (
  selectedNode: number | null,
  onSelect: (id: number, isAdditive: boolean) => void
): PendingSelectApi => {
  const [pending, setPending] = useState<number | null>(null);
  const [previous, setPrevious] = useState(selectedNode);

  if (previous !== selectedNode) {
    setPrevious(selectedNode);
    setPending(null);
  }

  useEffect(() => {
    if (pending === null) {
      return;
    }

    const timer = globalThis.setTimeout((): void => {
      setPending(null);
    }, PENDING_MS);

    return (): void => globalThis.clearTimeout(timer);
  }, [pending]);

  const select = useCallback(
    (id: number, isAdditive: boolean): void => {
      if (!isAdditive) {
        setPending(id);
      }

      onSelect(id, isAdditive);
    },
    [onSelect]
  );

  return { pending, select, shown: pending ?? selectedNode };
};

export { usePendingSelect };
