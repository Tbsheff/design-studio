import type { ReactElement } from "react";

import { pick } from "../../platform/pick.js";
import { copy } from "./copy";

interface SettingsModalFootProps {
  readonly isSaving: boolean;
  readonly onClose: () => void;
  readonly onSave: () => void;
}

const SettingsModalFoot = ({
  isSaving,
  onClose,
  onSave,
}: SettingsModalFootProps): ReactElement => (
  <div className="modal-foot">
    <button type="button" className="btn ghost" onClick={onClose}>
      {copy.cancel}
    </button>
    <button
      type="button"
      className="btn primary"
      onClick={onSave}
      disabled={isSaving}
    >
      {pick(isSaving, "Saving…", "Save")}
    </button>
  </div>
);

export { SettingsModalFoot };
