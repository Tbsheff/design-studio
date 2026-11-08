import type { ComponentInfo } from "@design-studio/contracts";
import { useEffect, useRef, useState } from "react";

import { json } from "../../api.js";
import type { FilesChange } from "../home/use-studio-data.js";
import { getBlob } from "./deps.js";

const REFRESH_MS = 400;

const base = (projectId: string, directionId: string): string =>
  `/api/projects/${encodeURIComponent(projectId)}/d/${encodeURIComponent(directionId)}/components`;

const componentThumb = (
  projectId: string,
  directionId: string,
  id: string,
  version: string
): Promise<Blob | null> =>
  getBlob(
    `${base(projectId, directionId)}/${encodeURIComponent(id)}/thumb?v=${encodeURIComponent(version)}`
  );

interface ComponentList {
  components: ComponentInfo[] | null;
  version: string;
  error: string | null;
  retry?: () => void;
}

const toChangedAt = (
  lastChange: FilesChange | null,
  directionId: string | null
): number => {
  if (lastChange && lastChange.directionId === directionId) {
    return lastChange.changedAt;
  }

  return 0;
};

const toRefreshDelay = (changedAt: number, attempt: number): number => {
  if (changedAt === 0 || attempt > 0) {
    return 0;
  }

  return REFRESH_MS;
};

interface KeyedList {
  key: string;
  list: ComponentList;
}

const EMPTY_LIST: ComponentList = {
  components: null,
  error: null,
  version: "0",
};

const toListKey = (projectId: string, directionId: string | null): string =>
  `${projectId}:${directionId}`;

const toKeptList = (prev: KeyedList, key: string): ComponentList => {
  if (prev.key === key) {
    return prev.list;
  }

  return EMPTY_LIST;
};

const useComponents = (
  projectId: string,
  directionId: string | null,
  lastChange: FilesChange | null
): ComponentList => {
  const [state, setState] = useState<KeyedList>({
    key: toListKey(projectId, directionId),
    list: EMPTY_LIST,
  });

  const changedAt = toChangedAt(lastChange, directionId);

  const seq = useRef(0);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!directionId) {
      return;
    }

    seq.current += 1;
    const my = seq.current;
    const version = String(changedAt);
    const key = toListKey(projectId, directionId);

    const timer = globalThis.setTimeout(
      async () => {
        try {
          const result = await json<{ components: ComponentInfo[] }>(
            "GET",
            base(projectId, directionId)
          );

          if (my === seq.current) {
            setState({
              key,
              list: { components: result.components, error: null, version },
            });
          }
        } catch (error: unknown) {
          let message = String(error);

          if (error instanceof Error) {
            ({ message } = error);
          }

          if (my === seq.current) {
            setState((prev) => ({
              key,
              list: { ...toKeptList(prev, key), error: message },
            }));
          }
        }
      },
      toRefreshDelay(changedAt, attempt)
    );

    return (): void => globalThis.clearTimeout(timer);
  }, [projectId, directionId, changedAt, attempt]);

  return {
    ...toKeptList(state, toListKey(projectId, directionId)),
    retry: () => setAttempt((count) => count + 1),
  };
};

export { componentThumb, useComponents };

export type { ComponentList };
