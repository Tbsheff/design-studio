import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy as uiCopy } from "./copy.js";
import type { ExportStatus } from "./export-formats.js";
import { ExportStatusLine } from "./export-status-line.js";
import { pick } from "./pick.js";

interface ExportDialogFootProps {
  readonly status: ExportStatus;
  readonly isHandoff: boolean;
  readonly isBusy: boolean;
  readonly canRun: boolean;
  readonly hasResult: boolean;
  readonly actionText: string;
  readonly onClose: () => void;
  readonly onRun: () => void;
}

const ExportDialogFoot = ({
  actionText,
  canRun,
  hasResult,
  isBusy,
  isHandoff,
  onClose,
  onRun,
  status,
}: ExportDialogFootProps): ReactElement => (
  <div className="modal-foot">
    <ExportStatusLine status={status} isHandoff={isHandoff} />
    <button
      type="button"
      className="btn ghost"
      onClick={onClose}
      disabled={isBusy}
    >
      {uiCopy.close}
    </button>
    <button
      type="button"
      className={`btn has-icon${pick(hasResult, "", " primary")}`}
      disabled={!canRun}
      onClick={onRun}
      data-autofocus
    >
      <Icon name={pick(isHandoff, "terminal", "download")} size={14} />
      {actionText}
    </button>
  </div>
);

export { ExportDialogFoot };
