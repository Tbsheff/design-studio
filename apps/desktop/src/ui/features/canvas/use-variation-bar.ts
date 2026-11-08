import type { Direction, Project } from "@design-studio/contracts";
import { useCallback, useState } from "react";

import { errorText } from "../../api.js";
import { showVariationFrames } from "./canvas-variations-model.js";
import type { VariationsState } from "./use-variations.js";

interface VariationBarActions {
  readonly cancelAll: () => Promise<void>;
  readonly dismissNotice: () => void;
  readonly noticeText: string | null;
  readonly showAll: () => void;
}

const useVariationBar = (
  state: VariationsState,
  project: Project,
  direction: Direction | null,
  group: Direction[]
): VariationBarActions => {
  const [cancelError, setCancelError] = useState<string | null>(null);
  const groupId = group[0]?.variation?.groupId ?? null;
  const { cancelAll: cancelRuns, clearNotice, keepNotice, notice } = state;
  const directionId = direction?.id ?? null;

  const showAll = useCallback((): void => {
    keepNotice(null);
    showVariationFrames(
      project.id,
      group.map((member) => member.id),
      directionId,
      false
    );
  }, [keepNotice, project.id, group, directionId]);

  const cancelAll = useCallback(async (): Promise<void> => {
    setCancelError(null);

    if (!groupId) {
      return;
    }

    try {
      await cancelRuns(groupId);
    } catch (error) {
      setCancelError(
        `Could not cancel the runs. ${errorText(error)} Try again.`
      );
    }
  }, [cancelRuns, groupId]);

  const dismissNotice = useCallback((): void => {
    if (cancelError) {
      setCancelError(null);

      return;
    }

    clearNotice();
  }, [cancelError, clearNotice]);

  const noticeText = cancelError ?? notice;

  return { cancelAll, dismissNotice, noticeText, showAll };
};

export { useVariationBar };
