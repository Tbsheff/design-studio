import type {
  DesignSystemCheckResult,
  DesignSystemCoverage,
} from "@design-studio/contracts";
import { useEffect, useState, startTransition } from "react";

import { errorText } from "../../api.js";
import { packApi } from "../../platform/pack-api.js";

interface DraftChange {
  readonly changedAt: number;
  readonly directionId: string;
}

interface DraftInfoState {
  readonly check: DesignSystemCheckResult | null;
  readonly coverage: DesignSystemCoverage | null;
  readonly error: string | null;
  readonly stamp: string;
}

const toStamp = (
  lastChange: DraftChange | null,
  runStatus: string | undefined
): string => `${lastChange?.changedAt ?? ""}|${runStatus ?? ""}`;

const useDraftInfo = (
  projectId: string | null,
  lastChange: DraftChange | null,
  runStatus: string | undefined
): DraftInfoState => {
  const stamp = toStamp(lastChange, runStatus);

  const [state, setState] = useState<DraftInfoState>({
    check: null,
    coverage: null,
    error: null,
    stamp,
  });

  useEffect(() => {
    if (!projectId) {
      return;
    }

    let live = true;
    startTransition(async () => {
      try {
        const info = await packApi.getDesignSystemDraft(projectId);

        if (live) {
          setState({
            check: info.check,
            coverage: info.coverage,
            error: null,
            stamp,
          });
        }
      } catch (error: unknown) {
        if (live) {
          setState({
            check: null,
            coverage: null,
            error: errorText(error),
            stamp,
          });
        }
      }
    });

    return (): void => {
      live = false;
    };
  }, [projectId, stamp]);

  return state;
};

export { useDraftInfo };

export type { DraftChange, DraftInfoState };
