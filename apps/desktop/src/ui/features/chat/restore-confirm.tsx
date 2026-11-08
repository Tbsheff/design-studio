import type { ReactElement } from "react";

import { copy } from "./copy.js";

const RestoreConfirm = ({
  count,
  onCancel,
  onConfirm,
}: {
  count: number;
  onCancel: () => void;
  onConfirm: () => void;
}): ReactElement => (
  <dialog
    open
    className="msg-confirm"
    aria-label={copy.restoreCodeHere}
    data-testid="restore-confirm"
  >
    <p>
      {copy.unfinishedChangesIn}
      {count}
      {copy.file}
      {count === 1 && ""}
      {count !== 1 && "s"}
      {copy.restoreReplacesEditsTo}
    </p>
    <div className="msg-confirm-actions">
      <button type="button" className="btn ghost small" onClick={onCancel}>
        {copy.cancel}
      </button>
      <button type="button" className="btn small primary" onClick={onConfirm}>
        {copy.restore}
      </button>
    </div>
  </dialog>
);

export { RestoreConfirm };
