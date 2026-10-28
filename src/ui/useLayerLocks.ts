import { useCallback, useEffect, useRef } from 'react';
import type { BridgeToParent } from '../shared/contracts';
import type { ParentMessageBody } from './bridge';

const PREFIX = 'studio.layer-locks';

function storageKey(projectId: string, directionId: string | null): string {
  return `${PREFIX}:${projectId}:${directionId ?? ''}`;
}

function readKeys(key: string): string[] {
  try {
    const raw: unknown = JSON.parse(window.localStorage.getItem(key) ?? '[]');
    return Array.isArray(raw) ? raw.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function writeKeys(key: string, keys: string[]): void {
  try {
    if (keys.length === 0) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(keys));
  } catch {
    void 0;
  }
}

export interface LayerLocks {
  setNodeLocked: (id: number, locked: boolean) => void;
  onBridge: (message: BridgeToParent) => void;
}

export function useLayerLocks(projectId: string, directionId: string | null, frontToken: string | null, post: (body: ParentMessageBody) => void): LayerLocks {
  const key = storageKey(projectId, directionId);
  const keys = useRef<string[]>([]);
  const live = useRef({ key, post });
  live.current = { key, post };

  const send = useCallback(() => {
    const { post: postNow } = live.current;
    postNow({ type: 'set-locks', keys: keys.current });
    if (keys.current.length > 0) postNow({ type: 'request-tree' });
  }, []);

  useEffect(() => {
    keys.current = readKeys(key);
  }, [key]);

  useEffect(() => {
    if (frontToken) send();
  }, [frontToken, key, send]);

  const setNodeLocked = useCallback((id: number, locked: boolean) => live.current.post({ type: 'lock-node', id, locked }), []);

  const onBridge = useCallback(
    (message: BridgeToParent) => {
      if (message.type === 'ready') send();
      if (message.type !== 'locks' || !Array.isArray(message.keys)) return;
      keys.current = message.keys.filter((item): item is string => typeof item === 'string');
      writeKeys(live.current.key, keys.current);
    },
    [send],
  );

  return { setNodeLocked, onBridge };
}
