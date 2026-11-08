import type { SelectionContext } from "@design-studio/contracts";
import { startTransition, useEffect, useMemo, useState } from "react";

import { api, errorText } from "../../api.js";
import { useProjectEvents } from "../../platform/events.js";
import {
  toFallbackSnippet,
  toKeepReady,
  toLoadedSnippet,
  toSnippetRequest,
} from "./snippet-model.js";
import type { Snippet } from "./snippet-model.js";

const useSnippet = (
  projectId: string,
  directionId: string | null,
  selection: SelectionContext | null
): Snippet => {
  const [loaded, setLoaded] = useState<Snippet>({ kind: "loading" });
  const [tick, setTick] = useState(0);

  useProjectEvents(projectId, (event) => {
    if (event.type === "version.created" && event.directionId === directionId) {
      setTick((value) => value + 1);
    }
  });

  const source = selection?.source ?? null;
  const file = source?.file ?? null;
  const line = source?.line ?? null;
  const col = source?.col ?? null;
  const fallback = selection?.outerHTML ?? "";

  const request = useMemo(() => {
    const point = { col, file, line };

    return toSnippetRequest({ directionId, fallback, point, projectId, tick });
  }, [projectId, directionId, fallback, col, file, line, tick]);

  useEffect(() => {
    if (!request) {
      return;
    }

    let isLive = true;

    startTransition(async () => {
      setLoaded(toKeepReady);

      try {
        const result = await api.elementSource(
          request.projectId,
          request.directionId,
          request.source
        );

        if (isLive) {
          setLoaded(toLoadedSnippet(result, request.fallback));
        }
      } catch (error: unknown) {
        if (isLive) {
          setLoaded({ kind: "error", message: errorText(error) });
        }
      }
    });

    return (): void => {
      isLive = false;
    };
  }, [request]);

  if (!request) {
    return toFallbackSnippet(fallback);
  }

  return loaded;
};

export { useSnippet };
