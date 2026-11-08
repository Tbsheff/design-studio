import type { ReactElement } from "react";

import { COPY } from "./copy.js";
import { toSaveLabel } from "./save-pack-model.js";

const SavePackFoot = ({
  canSave,
  isBusy,
  onClose,
}: {
  canSave: boolean;
  isBusy: boolean;
  onClose: () => void;
}): ReactElement => (
  <div className="modal-foot">
    <button
      type="button"
      className="btn ghost"
      onClick={onClose}
      disabled={isBusy}
    >
      {COPY.textCancel}
    </button>
    <button type="submit" className="btn primary" disabled={isBusy || !canSave}>
      {toSaveLabel(isBusy)}
    </button>
  </div>
);

export { SavePackFoot };
