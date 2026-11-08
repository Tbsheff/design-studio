import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy as uiCopy } from "./copy.js";
import { revealDownload } from "./export-api.js";

interface DoneStatus {
  readonly text: string;
  readonly note: string | null;
  readonly reveal: boolean;
}

const ExportDoneLine = ({
  done,
}: {
  readonly done: DoneStatus;
}): ReactElement => (
  <span className="export-done" data-tip={done.text}>
    <Icon name="check" size={14} />
    <span className="truncate">{done.text}</span>
    {done.note && <span className="export-sub">{`· ${done.note}`}</span>}
    {done.reveal && (
      <button
        type="button"
        className="btn small ghost"
        onClick={revealDownload}
      >
        {uiCopy.revealInFinder}
      </button>
    )}
  </span>
);

export { ExportDoneLine };
