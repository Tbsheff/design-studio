import type { HandoffResult } from "@design-studio/contracts/export";
import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { downloadBlob } from "../../domain/format.js";
import { copy as uiCopy } from "./copy.js";
import { toErrorText } from "./error-text.js";
import { exportApi } from "./export-api.js";
import type { ExportTarget } from "./export-api.js";
import { pick } from "./pick.js";
import { useCopied } from "./use-copied.js";

interface HandoffActionsProps {
  readonly target: ExportTarget;
  readonly result: HandoffResult;
  readonly folder: string;
  readonly onError: (text: string) => void;
}

const COPY_KEY = "prompt";

const HandoffActions = ({
  folder,
  onError,
  result,
  target,
}: HandoffActionsProps): ReactElement => {
  const [copied, copyText] = useCopied();
  const isCopied = copied === COPY_KEY;

  const copyPrompt = useCallback((): void => {
    void copyText(COPY_KEY, result.prompt);
  }, [copyText, result.prompt]);

  const runTask = useCallback(
    async (task: () => Promise<void>): Promise<void> => {
      try {
        await task();
      } catch (error) {
        onError(toErrorText(error as Error));
      }
    },
    [onError]
  );

  const downloadZip = useCallback((): void => {
    void runTask(async () => {
      const zip = await exportApi.handoffZip(target.projectId, folder);
      downloadBlob(zip.blob, zip.name);
    });
  }, [folder, runTask, target.projectId]);

  const reveal = useCallback((): void => {
    void runTask(() => exportApi.revealHandoff(target.projectId, folder));
  }, [folder, runTask, target.projectId]);

  return (
    <div className="export-row-actions">
      <button
        type="button"
        className="btn small primary has-icon"
        onClick={copyPrompt}
      >
        <Icon name={pick(isCopied, "check", "copy")} size={14} />
        <span aria-live="polite">
          {pick(isCopied, uiCopy.copied, uiCopy.copyPromptForClaude)}
        </span>
      </button>
      <button
        type="button"
        className="btn small has-icon"
        onClick={downloadZip}
      >
        <Icon name="download" size={14} />
        {uiCopy.downloadZip}
      </button>
      <button type="button" className="btn small ghost" onClick={reveal}>
        {uiCopy.revealInFinder}
      </button>
    </div>
  );
};

export { HandoffActions };
