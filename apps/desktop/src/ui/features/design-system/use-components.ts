import type { ComponentInfo } from "@design-studio/contracts";
import { useEffect, useRef, useState } from "react";

import { json } from "../../api.js";
import { readBlob } from "../../platform/http.js";
import type { FilesChange } from "../home/use-studio-data.js";
import { getBlob } from "./deps.js";
import { trimmedOrSelf } from "./thumb-trim.js";

const REFRESH_MS = 400;

const base = (projectId: string, directionId: string): string =>
  `/api/projects/${encodeURIComponent(projectId)}/d/${encodeURIComponent(directionId)}/components`;

const componentThumb = async (
  projectId: string,
  directionId: string,
  id: string,
  version: string
): Promise<string | null> => {
  const blob = await getBlob(
    `${base(projectId, directionId)}/${encodeURIComponent(id)}/thumb?v=${encodeURIComponent(version)}`
  );

  if (blob === null) {
    return null;
  }

  return URL.createObjectURL(blob);
};

const trimmedUrl = async (url: string | null): Promise<string | null> => {
  if (!url) {
    return url;
  }

  const blob = await readBlob(url);
  const next = await trimmedOrSelf(blob);

  if (next === blob) {
    return url;
  }

  URL.revokeObjectURL(url);

  return URL.createObjectURL(next);
};

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

const toRefreshDelay = (changedAt: number): number => {
  if (changedAt === 0) {
    return 0;
  }

  return REFRESH_MS;
};

const useComponents = (
  projectId: string,
  directionId: string | null,
  lastChange: FilesChange | null
): ComponentList => {
  const [state, setState] = useState<ComponentList>({
    components: null,
    error: null,
    version: "0",
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

    const timer = globalThis.setTimeout(async () => {
      try {
        const result = await json<{ components: ComponentInfo[] }>(
          "GET",
          base(projectId, directionId)
        );

        if (my === seq.current) {
          setState({ components: result.components, error: null, version });
        }
      } catch (error: unknown) {
        let message = String(error);

        if (error instanceof Error) {
          ({ message } = error);
        }

        if (my === seq.current) {
          setState((prev) => ({ ...prev, error: message }));
        }
      }
    }, toRefreshDelay(changedAt));

    return (): void => globalThis.clearTimeout(timer);
  }, [projectId, directionId, changedAt, attempt]);
  useEffect(
    () => setState({ components: null, error: null, version: "0" }),
    [projectId, directionId]
  );

  return { ...state, retry: () => setAttempt((count) => count + 1) };
};

export { componentThumb, trimmedUrl, useComponents };

export type { ComponentList };
