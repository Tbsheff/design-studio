import type { ReactElement } from "react";

import { copy } from "./copy.js";

interface ScreenDialogFootProps {
  readonly isDisabled: boolean;
  readonly label: string;
  readonly onClose: () => void;
}

const ScreenDialogFoot = ({
  isDisabled,
  label,
  onClose,
}: ScreenDialogFootProps): ReactElement => (
  <div className="modal-foot">
    <button className="btn ghost" onClick={onClose} type="button">
      {copy.cancel}
    </button>
    <button className="btn primary" disabled={isDisabled} type="submit">
      {label}
    </button>
  </div>
);

export { ScreenDialogFoot };
