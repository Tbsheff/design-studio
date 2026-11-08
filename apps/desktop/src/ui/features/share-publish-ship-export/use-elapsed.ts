import { useEffect, useState } from "react";

import type { ExportStatus } from "./export-formats.js";

const TICK_MS = 1000;

const useElapsed = (status: ExportStatus): number => {
  const [now, setNow] = useState(() => Date.now());

  const isBusy = status.kind === "busy";

  useEffect(() => {
    if (!isBusy) {
      return;
    }

    let timer: ReturnType<typeof globalThis.setTimeout> | null = null;

    const schedule = (): void => {
      timer = globalThis.setTimeout(() => {
        setNow(Date.now());
        schedule();
      }, TICK_MS);
    };

    schedule();

    return (): void => {
      if (timer !== null) {
        globalThis.clearTimeout(timer);
      }
    };
  }, [isBusy]);

  if (status.kind !== "busy") {
    return 0;
  }

  return Math.max(0, Math.floor((now - status.startedAt) / TICK_MS));
};

export { useElapsed };
