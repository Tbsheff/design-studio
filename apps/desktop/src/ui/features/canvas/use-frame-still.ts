import { useCallback, useEffect, useSyncExternalStore } from "react";

import type { FrameStills, StillRequest } from "./frame-still-model.js";
import { startStillJob, stopStillJob } from "./frame-still-queue.js";

interface StillTarget {
  readonly key: string | null;
  readonly request: StillRequest;
  readonly isWanted: boolean;
}

const useFrameStill = (
  stills: FrameStills,
  target: StillTarget
): string | null => {
  const { isWanted, key, request } = target;
  const { directionId, frameId, projectId } = request;

  useEffect(() => {
    if (!isWanted || key === null || stills.urls.has(key)) {
      return;
    }

    startStillJob(stills, {
      key,
      request: { directionId, frameId, projectId },
    });

    return (): void => stopStillJob(stills, key);
  }, [directionId, frameId, isWanted, key, projectId, stills]);

  const read = useCallback((): string | null => {
    const latest = stills.latest.get(frameId) ?? null;

    if (key === null) {
      return latest;
    }

    return stills.urls.get(key) ?? latest;
  }, [frameId, key, stills]);

  return useSyncExternalStore(stills.changes.subscribe, read, read);
};

const useStillSwap = (
  isStill: boolean,
  nextSrc: string | null,
  frameId: string,
  onNextLoad: (id: string) => void
): void => {
  useEffect(() => {
    if (isStill && nextSrc) {
      onNextLoad(frameId);
    }
  }, [frameId, isStill, nextSrc, onNextLoad]);
};

export { useFrameStill, useStillSwap };

export type { StillTarget };
