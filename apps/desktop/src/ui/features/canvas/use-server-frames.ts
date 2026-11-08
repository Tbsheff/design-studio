import type { AppServerStatus } from "@design-studio/contracts";
import { useEffect, useState } from "react";

import { reloadAppStageFrames } from "../../platform/stage-dom.js";
import type { Listen } from "./app-canvas-routes-model.js";

const LOAD_HINT_MS = 30_000;

interface TrackedStatus {
  readonly epoch: number;
  readonly status: AppServerStatus | null;
}

const noop = (): null => null;

const needsReload = (
  prev: AppServerStatus | null,
  next: AppServerStatus | null
): boolean => {
  if (!prev || next?.state !== "ready") {
    return false;
  }

  return prev.state !== "ready" || prev.upstream !== next.upstream;
};

const useServerFrames = (
  status: AppServerStatus | null,
  listen: Listen,
  isEnabled: boolean
): boolean => {
  const [tracked, setTracked] = useState<TrackedStatus>({ epoch: 0, status });
  const [loadedEpoch, setLoadedEpoch] = useState<number | null>(null);
  const { epoch } = tracked;
  const isReady = status?.state === "ready";

  if (tracked.status !== status) {
    let nextEpoch = epoch;

    if (isEnabled && needsReload(tracked.status, status)) {
      nextEpoch = epoch + 1;
    }

    setTracked({ epoch: nextEpoch, status });
  }

  const isLoaded = isReady && loadedEpoch === epoch;

  useEffect(() => {
    if (epoch > 0) {
      reloadAppStageFrames();
    }
  }, [epoch]);

  useEffect(() => {
    if (!isReady || isLoaded) {
      return noop;
    }

    const timer = globalThis.setTimeout(
      () => setLoadedEpoch(epoch),
      LOAD_HINT_MS
    );

    return (): void => globalThis.clearTimeout(timer);
  }, [isReady, isLoaded, epoch]);

  useEffect(() => {
    if (!isEnabled) {
      return noop;
    }

    return listen((message) => {
      if (message.type === "ready") {
        setLoadedEpoch(epoch);
      }
    });
  }, [listen, isEnabled, epoch]);

  return isLoaded;
};

export { useServerFrames };
