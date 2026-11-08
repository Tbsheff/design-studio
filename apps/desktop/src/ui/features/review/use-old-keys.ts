import type { RenderCheckResult } from "@design-studio/contracts";
import { useEffect, useState } from "react";

import type { FinalCheckWithBaseline } from "../../../shared/final-check-baseline.js";
import { api } from "../../api.js";
import { toDirectionId } from "./render-check-model.js";

interface OldKeys {
  readonly directionId: string;
  readonly keys: string[] | null;
}

const useOldKeys = (
  projectId: string,
  results: readonly RenderCheckResult[] | null
): string[] | null => {
  const [loaded, setLoaded] = useState<OldKeys | null>(null);
  const directionId = toDirectionId(results);

  useEffect(() => {
    let isAlive = true;

    if (!directionId || !results) {
      return;
    }

    const load = async (): Promise<void> => {
      try {
        const runs = await api.listRuns(projectId);

        const run = runs.find(
          (summary) =>
            summary.directionId === directionId &&
            (summary.finalCheck as FinalCheckWithBaseline | null)?.baseline
        );

        const baseline = (run?.finalCheck as FinalCheckWithBaseline | null)
          ?.baseline;

        if (isAlive) {
          setLoaded({ directionId, keys: baseline?.keys ?? null });
        }
      } catch {
        if (isAlive) {
          setLoaded(null);
        }
      }
    };

    void load();

    return (): void => {
      isAlive = false;
    };
  }, [projectId, directionId, results]);

  if (loaded && loaded.directionId === directionId) {
    return loaded.keys;
  }

  return null;
};

export { useOldKeys };
