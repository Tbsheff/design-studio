import type { RunLevel, SelectionContext } from "@design-studio/contracts";
import { useCallback } from "react";
import type { RefObject } from "react";

import { variationsApi } from "./variations-api.js";
import type { Options } from "./variations-model.js";

interface KeptVariation {
  versionId: string;
  directionId: string;
  label: string;
}

interface RemoteActions {
  cancelAll: (groupId: string) => Promise<void>;
  keepElement: (groupId: string, directionId: string) => Promise<KeptVariation>;
  mix: (
    fromDirectionId: string,
    toDirectionId: string,
    element: SelectionContext,
    level: RunLevel
  ) => Promise<string>;
}

const useVariationsRemote = (settings: RefObject<Options>): RemoteActions => {
  const keepElement = useCallback(
    async (groupId: string, directionId: string): Promise<KeptVariation> => {
      const { projectId, setDirectionId } = settings.current;
      const kept = await variationsApi.keep(projectId, groupId, directionId);
      setDirectionId(kept.directionId);

      return kept;
    },
    [settings]
  );

  const mix = useCallback(
    async (
      fromDirectionId: string,
      toDirectionId: string,
      element: SelectionContext,
      level: RunLevel
    ): Promise<string> => {
      const { projectId, seedRun } = settings.current;

      const { runId } = await variationsApi.mix(projectId, {
        element,
        fromDirectionId,
        level,
        toDirectionId,
      });

      seedRun(runId, toDirectionId, {
        level,
        mode: "edit",
        prompt: `Use the ${element.tag} from another variation`,
      });

      return runId;
    },
    [settings]
  );

  const cancelAll = useCallback(
    async (groupId: string): Promise<void> => {
      await variationsApi.cancel(settings.current.projectId, groupId);
    },
    [settings]
  );

  return { cancelAll, keepElement, mix };
};

export { useVariationsRemote };

export type { KeptVariation, RemoteActions };
