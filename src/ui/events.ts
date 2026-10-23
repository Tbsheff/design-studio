import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import type { StudioEvent } from '../shared/contracts';
import { eventsUrl } from './api';
import { createEventHub, type ConnectionState } from './eventHub';

export type { ConnectionState } from './eventHub';

const hub = createEventHub({
  open: (projectId, afterSeq) => new EventSource(eventsUrl(projectId, afterSeq)),
  setTimer: (fn, ms) => window.setTimeout(fn, ms),
  clearTimer: (id) => window.clearTimeout(id),
  defer: (fn) => queueMicrotask(fn),
});

export function useProjectEvents(projectId: string | null, onEvent: (event: StudioEvent) => void): ConnectionState {
  const handler = useRef(onEvent);
  handler.current = onEvent;

  useEffect(() => {
    if (!projectId) return;
    return hub.subscribe(projectId, (event) => handler.current(event));
  }, [projectId]);

  const watch = useCallback((onChange: () => void) => (projectId ? hub.watchState(projectId, onChange) : () => undefined), [projectId]);
  const read = useCallback(() => (projectId ? hub.state(projectId) : 'connecting'), [projectId]);
  return useSyncExternalStore(watch, read, read);
}
