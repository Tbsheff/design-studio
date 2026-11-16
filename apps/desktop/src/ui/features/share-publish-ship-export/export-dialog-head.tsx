import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy as uiCopy } from "./copy.js";
import { ExportDialogTitles } from "./export-dialog-titles.js";

interface ExportDialogHeadProps {
  readonly versionLabel: string | null;
  readonly isBusy: boolean;
  readonly onClose: () => void;
}

const ExportDialogHead = ({
  isBusy,
  onClose,
  versionLabel,
}: ExportDialogHeadProps): ReactElement => (
  <div className="modal-head">
    <ExportDialogTitles versionLabel={versionLabel} />
    <button
      type="button"
      className="icon-btn"
      aria-label={uiCopy.closeExport}
      onClick={onClose}
      disabled={isBusy}
    >
      <Icon name="close" />
    </button>
  </div>
);

export { ExportDialogHead };
