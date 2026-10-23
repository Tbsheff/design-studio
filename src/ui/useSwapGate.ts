import { useCallback, useEffect, useRef, useState } from 'react';
import type { Direction, ProjectKind } from '../shared/contracts';
import type { FilesChange } from './useStudioData';

const SWAP_RELEASE_MS = 4000;

interface SwapGate {
  changeFor: (directionId: string) => FilesChange | null;
  onSwapDone: (directionId: string) => void;
}

export function useSwapGate(kind: ProjectKind, directions: Direction[], lastChange: FilesChange | null): SwapGate {
  const [delivered, setDelivered] = useState<Record<string, FilesChange>>({});
  const queue = useRef(new Map<string, FilesChange>());
  const inFlight = useRef<string | null>(null);
  const timer = useRef<number | null>(null);
  const heads = useRef<Record<string, string | null>>({});
  const ids = directions.map((direction) => direction.id);
  const idKey = ids.join(',');

  const pumpRef = useRef<() => void>(() => undefined);

  const release = useCallback((directionId: string) => {
    if (inFlight.current !== directionId) return;
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    inFlight.current = null;
    pumpRef.current();
  }, []);

  pumpRef.current = () => {
    if (inFlight.current !== null) return;
    const next = queue.current.entries().next();
    if (next.done) return;
    const [directionId, change] = next.value;
    queue.current.delete(directionId);
    inFlight.current = directionId;
    timer.current = window.setTimeout(() => release(directionId), SWAP_RELEASE_MS);
    setDelivered((prev) => ({ ...prev, [directionId]: change }));
  };

  const offer = useCallback(
    (change: FilesChange) => {
      if (kind === 'react') {
        setDelivered((prev) => ({ ...prev, [change.directionId]: change }));
        return;
      }
      queue.current.set(change.directionId, change);
      pumpRef.current();
    },
    [kind],
  );

  useEffect(() => {
    if (!lastChange || !idKey.split(',').includes(lastChange.directionId)) return;
    offer(lastChange);
  }, [lastChange, idKey, offer]);

  const headKey = directions.map((direction) => `${direction.id}:${direction.headVersionId ?? ''}`).join('|');
  useEffect(() => {
    for (const direction of directions) {
      const previous = heads.current[direction.id];
      heads.current[direction.id] = direction.headVersionId;
      if (previous === undefined || previous === direction.headVersionId || kind === 'react') continue;
      const now = Date.now();
      offer({ directionId: direction.id, changedAt: now, receivedAt: now, paths: [] });
    }
  }, [headKey]);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  const changeFor = useCallback((directionId: string) => delivered[directionId] ?? null, [delivered]);
  return { changeFor, onSwapDone: release };
}
