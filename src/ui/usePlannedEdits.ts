import { useRef } from 'react';
import type { StudioEvent } from '../shared/contracts';
import { useProjectEvents } from './events';
import { postToLiveFrames } from './tokenFrames';

const FRESH_MS = 5000;

function patchIds(id: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => `${id}:${index}`);
}

export function usePlannedEdits(projectId: string, directionId: string | null, live: boolean): void {
  const counts = useRef(new Map<string, number>());
  useProjectEvents(projectId, (event: StudioEvent) => {
    if (!live || !directionId || event.directionId !== directionId || Date.now() - event.ts > FRESH_MS) return;
    if (event.type === 'edit.planned') {
      if (counts.current.size > 200) counts.current.clear();
      counts.current.set(event.id, event.patches.length);
      event.patches.forEach((patch, index) => postToLiveFrames({ type: 'optimistic-apply', id: `${event.id}:${index}`, patch: { ...patch, trusted: false }, written: true }));
    }
    if (event.type === 'edit.unplanned') {
      for (const id of patchIds(event.id, counts.current.get(event.id) ?? 0)) postToLiveFrames({ type: 'optimistic-settle', id, ok: false, reason: 'The edit was not saved.' });
      counts.current.delete(event.id);
    }
  });
}
