import type { BridgeToParent, StudioEvent } from "@design-studio/contracts";
import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

import { cleanLockKeys } from "../../../shared/layer-locks.js";
import type { LayerLocksView } from "../../../shared/layer-locks.js";
import { json } from "../../api.js";
import type { ParentMessageBody } from "../../platform/bridge.js";
import { useProjectEvents } from "../../platform/events.js";
import { readStored, removeStored } from "../../platform/storage.js";

const LEGACY_PREFIX = "studio.layer-locks";

const legacyKey = (projectId: string, directionId: string): string =>
  `${LEGACY_PREFIX}:${projectId}:${directionId}`;

const readLegacy = (key: string): string[] => {
  try {
    return cleanLockKeys(JSON.parse(readStored(key) ?? "[]"));
  } catch {
    return [];
  }
};

const dropLegacy = (key: string): void => {
  removeStored(key);
};

const locksPath = (projectId: string, directionId: string): string =>
  `/api/projects/${encodeURIComponent(projectId)}/d/${encodeURIComponent(directionId)}/layer-locks`;

const loadLocks = async (
  projectId: string,
  directionId: string
): Promise<string[]> => {
  const view = await json<LayerLocksView>(
    "GET",
    locksPath(projectId, directionId)
  );

  const legacy = legacyKey(projectId, directionId);
  const known = new Set(view.keys);
  const old = readLegacy(legacy).filter((key) => !known.has(key));

  if (old.length === 0) {
    dropLegacy(legacy);

    return view.keys;
  }

  const merged = await json<LayerLocksView>(
    "PUT",
    locksPath(projectId, directionId),
    { add: old }
  );

  dropLegacy(legacy);

  return merged.keys;
};

const same = (first: string[], second: string[]): boolean =>
  first.length === second.length &&
  first.every((key, index) => key === second[index]);

const fetchLocks = async (
  projectId: string,
  directionId: string
): Promise<string[] | null> => {
  try {
    return await loadLocks(projectId, directionId);
  } catch {
    return null;
  }
};

interface LiveLocks {
  directionId: string | null;
  projectId: string;
  scope: string | null;
}

const persistLocks = async (
  cur: LiveLocks,
  loadedScope: string | null,
  keys: { current: string[] },
  message: BridgeToParent
): Promise<void> => {
  if (message.type !== "locks" || !Array.isArray(message.keys)) {
    return;
  }

  if (!cur.directionId || loadedScope !== cur.scope) {
    return;
  }

  const next = cleanLockKeys(message.keys);

  if (same(next, keys.current)) {
    return;
  }

  keys.current = next;
  await Promise.allSettled([
    json<LayerLocksView>("PUT", locksPath(cur.projectId, cur.directionId), {
      keys: next,
    }),
  ]);
};

const isNewLocksEvent = (
  event: StudioEvent,
  cur: LiveLocks,
  loadedScope: string | null,
  keys: string[]
): event is Extract<StudioEvent, { type: "layer-locks.changed" }> =>
  event.type === "layer-locks.changed" &&
  event.directionId === cur.directionId &&
  loadedScope === cur.scope &&
  !same(event.keys, keys);

interface LayerLocks {
  setNodeLocked: (id: number, locked: boolean) => void;
  onBridge: (message: BridgeToParent) => void;
}

interface LivePost extends LiveLocks {
  post: (body: ParentMessageBody) => void;
}

const postLocks = (
  cur: LivePost,
  loadedScope: string | null,
  keys: string[],
  always: boolean
): void => {
  if (!cur.scope || loadedScope !== cur.scope) {
    return;
  }

  cur.post({ keys, type: "set-locks" });

  if (keys.length > 0 || always) {
    cur.post({ type: "request-tree" });
  }
};

interface LoadInput {
  directionId: string | null;
  projectId: string;
  scope: string | null;
  onLoaded: (list: string[], loadedScope: string) => void;
  onReset: () => void;
}

const useLoadLocks = (input: LoadInput): void => {
  const { directionId, onLoaded, onReset, projectId, scope } = input;

  useEffect(() => {
    onReset();

    if (!directionId || !scope) {
      return;
    }

    let active = true;

    const load = async (): Promise<void> => {
      const list = await fetchLocks(projectId, directionId);

      if (list && active) {
        onLoaded(list, scope);
      }
    };

    load();

    return (): void => {
      active = false;
    };
  }, [projectId, directionId, scope, onLoaded, onReset]);
};

const toScope = (
  projectId: string,
  directionId: string | null
): string | null => {
  if (directionId) {
    return `${projectId}/${directionId}`;
  }

  return null;
};

const useLayerLocks = (
  projectId: string,
  directionId: string | null,
  frontToken: string | null,
  post: (body: ParentMessageBody) => void
): LayerLocks => {
  const scope = toScope(projectId, directionId);
  const keys = useRef<string[]>([]);
  const loaded = useRef<string | null>(null);
  const live = useRef({ directionId, post, projectId, scope });

  useLayoutEffect(() => {
    live.current = { directionId, post, projectId, scope };
  }, [directionId, post, projectId, scope]);

  const send = useCallback((always = false): void => {
    postLocks(live.current, loaded.current, keys.current, always);
  }, []);

  const onReset = useCallback((): void => {
    keys.current = [];
    loaded.current = null;
  }, []);

  const onLoaded = useCallback(
    (list: string[], loadedScope: string): void => {
      keys.current = list;
      loaded.current = loadedScope;
      send();
    },
    [send]
  );

  useLoadLocks({ directionId, onLoaded, onReset, projectId, scope });

  useEffect(() => {
    if (frontToken) {
      send();
    }
  }, [frontToken, send]);

  const onProjectEvent = useCallback(
    (event: StudioEvent): void => {
      if (isNewLocksEvent(event, live.current, loaded.current, keys.current)) {
        keys.current = event.keys;
        send(true);
      }
    },
    [send]
  );

  useProjectEvents(projectId, onProjectEvent);

  const setNodeLocked = useCallback((id: number, locked: boolean): void => {
    live.current.post({ id, locked, type: "lock-node" });
  }, []);

  const onBridge = useCallback(
    (message: BridgeToParent): void => {
      if (message.type === "ready") {
        send();
      }

      if (message.type !== "locks" || !Array.isArray(message.keys)) {
        return;
      }

      persistLocks(live.current, loaded.current, keys, message);
    },
    [send]
  );

  return { onBridge, setNodeLocked };
};

export { useLayerLocks };

export type { LayerLocks };
