import { useCallback, useEffect, useRef } from 'react';
import type { BridgeToParent, StudioEvent } from '../shared/contracts';
import { cleanLockKeys, type LayerLocksView } from '../shared/layer-locks';
import { json } from './api';
import type { ParentMessageBody } from './bridge';
import { useProjectEvents } from './events';

const LEGACY_PREFIX = 'studio.layer-locks';

function legacyKey(projectId: string, directionId: string): string {
  return `${LEGACY_PREFIX}:${projectId}:${directionId}`;
}

function readLegacy(key: string): string[] {
  try {
    return cleanLockKeys(JSON.parse(window.localStorage.getItem(key) ?? '[]'));
  } catch {
    return [];
  }
}

function dropLegacy(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    void 0;
  }
}

function locksPath(projectId: string, directionId: string): string {
  return `/api/projects/${encodeURIComponent(projectId)}/d/${encodeURIComponent(directionId)}/layer-locks`;
}

async function loadLocks(projectId: string, directionId: string): Promise<string[]> {
  const view = await json<LayerLocksView>('GET', locksPath(projectId, directionId));
  const legacy = legacyKey(projectId, directionId);
  const old = readLegacy(legacy).filter((key) => !view.keys.includes(key));
  if (old.length === 0) {
    dropLegacy(legacy);
    return view.keys;
  }
  const merged = await json<LayerLocksView>('PUT', locksPath(projectId, directionId), { add: old });
  dropLegacy(legacy);
  return merged.keys;
}

function same(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((key, index) => key === b[index]);
}

export interface LayerLocks {
  setNodeLocked: (id: number, locked: boolean) => void;
  onBridge: (message: BridgeToParent) => void;
}

export function useLayerLocks(projectId: string, directionId: string | null, frontToken: string | null, post: (body: ParentMessageBody) => void): LayerLocks {
  const scope = directionId ? `${projectId}/${directionId}` : null;
  const keys = useRef<string[]>([]);
  const loaded = useRef<string | null>(null);
  const live = useRef({ projectId, directionId, scope, post });
  live.current = { projectId, directionId, scope, post };

  const send = useCallback((always = false) => {
    const cur = live.current;
    if (!cur.scope || loaded.current !== cur.scope) return;
    cur.post({ type: 'set-locks', keys: keys.current });
    if (keys.current.length > 0 || always) cur.post({ type: 'request-tree' });
  }, []);

  useEffect(() => {
    keys.current = [];
    loaded.current = null;
    if (!directionId || !scope) return;
    let active = true;
    loadLocks(projectId, directionId)
      .then((list) => {
        if (!active) return;
        keys.current = list;
        loaded.current = scope;
        send();
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [projectId, directionId, scope, send]);

  useEffect(() => {
    if (frontToken) send();
  }, [frontToken, scope, send]);

  useProjectEvents(projectId, (event: StudioEvent) => {
    if (event.type !== 'layer-locks.changed' || event.directionId !== live.current.directionId || loaded.current !== live.current.scope) return;
    if (same(event.keys, keys.current)) return;
    keys.current = event.keys;
    send(true);
  });

  const setNodeLocked = useCallback((id: number, locked: boolean) => live.current.post({ type: 'lock-node', id, locked }), []);

  const onBridge = useCallback(
    (message: BridgeToParent) => {
      if (message.type === 'ready') send();
      if (message.type !== 'locks' || !Array.isArray(message.keys)) return;
      const cur = live.current;
      if (!cur.directionId || loaded.current !== cur.scope) return;
      const next = cleanLockKeys(message.keys);
      if (same(next, keys.current)) return;
      keys.current = next;
      void json<LayerLocksView>('PUT', locksPath(cur.projectId, cur.directionId), { keys: next }).catch(() => undefined);
    },
    [send],
  );

  return { setNodeLocked, onBridge };
}
