import type { ReactElement } from "react";

import { COPY } from "./copy.js";
import { toSaveLabel } from "./design-md-model.js";

const DmdFoot = ({
  canSave,
  isSaving,
  modKey,
  onCancel,
  onSave,
}: {
  canSave: boolean;
  isSaving: boolean;
  modKey: string;
  onCancel: () => void;
  onSave: () => void;
}): ReactElement => (
  <div className="modal-foot">
    <span className="hint">
      <kbd>{modKey}</kbd>
      <kbd>{COPY.textS}</kbd> {COPY.textToSave}
    </span>
    <button type="button" className="btn ghost" onClick={onCancel}>
      {COPY.textCancel}
    </button>
    <button
      type="button"
      className="btn primary"
      onClick={onSave}
      disabled={isSaving || !canSave}
    >
      {toSaveLabel(isSaving)}
    </button>
  </div>
);

export { DmdFoot };
