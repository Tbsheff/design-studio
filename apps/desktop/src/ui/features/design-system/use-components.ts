import type { ComponentInfo } from "@design-studio/contracts";
import { useEffect, useRef, useState } from "react";

import { json } from "../../api.js";
import type { FilesChange } from "../home/use-studio-data.js";
import { getBlob } from "./deps.js";

const REFRESH_MS = 400;

const base = (projectId: string, directionId: string): string =>
  `/api/projects/${encodeURIComponent(projectId)}/d/${encodeURIComponent(directionId)}/components`;

export const componentThumb = async (
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

export interface ComponentList {
  components: ComponentInfo[] | null;
  version: string;
  error: string | null;
  retry?: () => void;
}

export const useComponents = (
  projectId: string,
  directionId: string | null,
  lastChange: FilesChange | null
): ComponentList => {
  const [state, setState] = useState<ComponentList>({
    components: null,
    error: null,
    version: "0",
  });

  const changedAt =
    lastChange && lastChange.directionId === directionId
      ? lastChange.changedAt
      : 0;

  const seq = useRef(0);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!directionId) {
      return;
    }

    seq.current += 1;
    const my = seq.current;
    const version = String(changedAt);

    const timer = globalThis.setTimeout(
      async () => {
        try {
          const result = await json<{ components: ComponentInfo[] }>(
            "GET",
            base(projectId, directionId)
          );

          if (my === seq.current) {
            setState({ components: result.components, error: null, version });
          }
        } catch (error: unknown) {
          if (my === seq.current) {
            setState((prev) => ({
              ...prev,
              error: error instanceof Error ? error.message : String(error),
            }));
          }
        }
      },
      changedAt === 0 ? 0 : REFRESH_MS
    );

    return () => globalThis.clearTimeout(timer);
  }, [projectId, directionId, changedAt, attempt]);
  useEffect(
    () => setState({ components: null, error: null, version: "0" }),
    [projectId, directionId]
  );

  return { ...state, retry: () => setAttempt((n) => n + 1) };
};
