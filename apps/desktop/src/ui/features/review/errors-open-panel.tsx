import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { ErrorsHeadButton } from "./errors-head-button.js";
import { ErrorsItem } from "./errors-item.js";
import { toCountText } from "./errors-model.js";
import type { ErrorLike } from "./errors-model.js";

interface ErrorsOpenPanelProps<Entry extends ErrorLike & { id: string }> {
  readonly shown: readonly Entry[];
  readonly onSend: (entry: Entry) => void;
  readonly onClose: () => void;
  readonly onClear: () => void;
}

const REGION_ROLE = "region";

const ErrorsOpenPanel = <Entry extends ErrorLike & { id: string }>({
  onClear,
  onClose,
  onSend,
  shown,
}: ErrorsOpenPanelProps<Entry>): ReactElement => (
  <div className="errors" role={REGION_ROLE} aria-label={copy.previewErrors}>
    <div className="section-head">
      <ErrorsHeadButton label={toCountText(shown.length)} onClose={onClose} />
      <button type="button" className="btn ghost small" onClick={onClear}>
        {copy.clear}
      </button>
    </div>
    <ul className="error-list">
      {shown.map((entry) => (
        <ErrorsItem key={entry.id} entry={entry} onSend={onSend} />
      ))}
    </ul>
  </div>
);

export { ErrorsOpenPanel };
