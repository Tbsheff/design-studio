import type { StudioEvent } from "@design-studio/contracts";
import { useCallback, useEffect, useSyncExternalStore } from "react";

import { createEventHub } from "./event-hub.js";
import type { ConnectionState } from "./event-hub.js";
import { appStream } from "./stream.js";
import { useLatest } from "./use-latest.js";

const noUnsubscribe = (): null => null;

const hub = createEventHub({
  clearTimer: (id) => {
    if (id !== null) {
      globalThis.clearTimeout(id);
    }
  },
  defer: (fn) => queueMicrotask(fn),
  open: (projectId, afterSeq) => appStream().source(projectId, afterSeq),
  setTimer: (fn, ms) => Number(globalThis.setTimeout(fn, ms)),
});

const useProjectEvents = (
  projectId: string | null,
  onEvent: (event: StudioEvent) => void
): ConnectionState => {
  const handler = useLatest(onEvent);

  useEffect(() => {
    if (!projectId) {
      return;
    }

    return hub.subscribe(projectId, (event) => handler.current(event));
  }, [handler, projectId]);

  const watch = useCallback(
    (onChange: () => void) => {
      if (projectId) {
        return hub.watchState(projectId, onChange);
      }

      return noUnsubscribe;
    },
    [projectId]
  );

  const read = useCallback(() => {
    if (projectId) {
      return hub.state(projectId);
    }

    return "connecting";
  }, [projectId]);

  return useSyncExternalStore(watch, read, read);
};

export { useProjectEvents };

export type { ConnectionState };
