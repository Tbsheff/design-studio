import type { ExportFormat } from "@design-studio/contracts/export";
import { useModalDialog } from "@design-studio/ui";
import { useCallback, useMemo } from "react";
import type { ReactElement } from "react";

import { useBackdropDismiss } from "../../platform/use-backdrop-dismiss.js";
import { canvasFrameName, framePage } from "../canvas/index.js";
import { copy as uiCopy } from "./copy.js";
import type { ExportTarget } from "./export-api.js";
import { ExportDialogBody } from "./export-dialog-body.js";
import { ExportDialogFoot } from "./export-dialog-foot.js";
import { ExportDialogHead } from "./export-dialog-head.js";
import { FORMATS } from "./export-formats.js";
import type { FormatInfo } from "./export-formats.js";
import { toFrameLabels } from "./frame-labels.js";
import { pick } from "./pick.js";
import type { SegmentOption } from "./segmented.js";
import { useEditors } from "./use-editors.js";
import { useExportOptions } from "./use-export-options.js";
import { useExportRunner } from "./use-export-runner.js";

interface Props {
  target: ExportTarget;
  onClose: () => void;
}

const FORMAT_OPTIONS: readonly SegmentOption<ExportFormat>[] = FORMATS.map(
  (entry) => ({ icon: entry.icon, id: entry.id, label: entry.label })
);

const FRAME_NAMERS = { nameOf: canvasFrameName, pageOf: framePage };

const toActionText = (
  info: FormatInfo,
  isError: boolean,
  isRebuild: boolean
): string => {
  if (isError) {
    return uiCopy.tryAgain;
  }

  return pick(isRebuild, uiCopy.rebuildHandoff, info.action);
};

const toFormatInfo = (format: ExportFormat): FormatInfo =>
  FORMATS.find((entry) => entry.id === format) ?? (FORMATS[0] as FormatInfo);

const ExportDialog = ({ onClose, target }: Props): ReactElement => {
  const options = useExportOptions(target);
  const runner = useExportRunner(target, options);
  const { format } = options;

  const labels = useMemo(
    () => toFrameLabels(options.projectId, options.frames, FRAME_NAMERS),
    [options]
  );

  const isHandoff = format === "handoff";
  const editors = useEditors(isHandoff);
  const { failWith, isBusy, resetStatus, run } = runner;

  const closeUnlessBusy = useCallback((): boolean => {
    if (isBusy) {
      return false;
    }

    onClose();

    return true;
  }, [isBusy, onClose]);

  const { ref } = useModalDialog(closeUnlessBusy);
  useBackdropDismiss(ref, closeUnlessBusy);

  const info = toFormatInfo(format);
  const result = pick(isHandoff, runner.handoff, null);

  const selectFormat = useCallback(
    (next: ExportFormat): void => {
      options.onChoose(next);
      resetStatus();
    },
    [options, resetStatus]
  );

  return (
    <dialog
      ref={ref}
      className="modal export-dialog"
      aria-label={uiCopy.export}
    >
      <ExportDialogHead
        versionLabel={target.versionLabel}
        isBusy={isBusy}
        onClose={onClose}
      />
      <ExportDialogBody
        target={target}
        options={options}
        labels={labels}
        info={info}
        formatOptions={FORMAT_OPTIONS}
        status={runner.status}
        isBusy={isBusy}
        result={result}
        editors={editors}
        onFormat={selectFormat}
        onError={failWith}
      />
      <ExportDialogFoot
        status={runner.status}
        isHandoff={isHandoff}
        isBusy={isBusy}
        canRun={runner.canRun}
        hasResult={result !== null}
        actionText={toActionText(
          info,
          runner.status.kind === "error",
          result !== null
        )}
        onClose={onClose}
        onRun={run}
      />
    </dialog>
  );
};

export { ExportDialog };

export type { Props };
