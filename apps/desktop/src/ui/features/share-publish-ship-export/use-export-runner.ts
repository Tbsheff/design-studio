import type { HandoffResult } from "@design-studio/contracts/export";
import { useCallback, useState } from "react";

import { toErrorText } from "./error-text.js";
import { exportApi } from "./export-api.js";
import type { ExportTarget } from "./export-api.js";
import { IDLE_STATUS } from "./export-formats.js";
import type { ExportStatus } from "./export-formats.js";
import { exportFlowOnce, exportOnce, toHandoffFrames } from "./export-run.js";
import type { ExportOptions } from "./use-export-options.js";

interface ExportRunner {
  readonly status: ExportStatus;
  readonly handoff: HandoffResult | null;
  readonly isBusy: boolean;
  readonly canRun: boolean;
  readonly run: () => void;
  readonly resetStatus: () => void;
  readonly failWith: (text: string) => void;
}

const useExportRunner = (
  target: ExportTarget,
  options: ExportOptions
): ExportRunner => {
  const [status, setStatus] = useState<ExportStatus>(IDLE_STATUS);
  const [handoff, setHandoff] = useState<HandoffResult | null>(null);
  const isBusy = status.kind === "busy";
  const canRun = !isBusy && (!options.needsFrames || options.chosen.length > 0);

  const execute = useCallback(async (): Promise<void> => {
    setStatus({ kind: "busy", startedAt: Date.now() });

    try {
      if (options.format === "handoff") {
        setHandoff(
          await exportApi.handoff(target.projectId, {
            frames: [...toHandoffFrames(options.chosen)],
            versionId: target.versionId,
          })
        );
        setStatus(IDLE_STATUS);

        return;
      }

      if (options.format === "flow") {
        setStatus(await exportFlowOnce(target, options));

        return;
      }

      setStatus(await exportOnce(target, options));
    } catch (error) {
      setStatus({ kind: "error", text: toErrorText(error as Error) });
    }
  }, [options, target]);

  const run = useCallback((): void => {
    if (canRun) {
      void execute();
    }
  }, [canRun, execute]);

  const resetStatus = useCallback((): void => {
    setStatus(IDLE_STATUS);
  }, []);

  const failWith = useCallback((text: string): void => {
    setStatus({ kind: "error", text });
  }, []);

  return { canRun, failWith, handoff, isBusy, resetStatus, run, status };
};

export { useExportRunner };

export type { ExportRunner };
