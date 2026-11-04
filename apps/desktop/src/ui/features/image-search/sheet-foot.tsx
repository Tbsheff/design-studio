import type { ReactElement } from "react";

import { copy } from "./copy.js";

interface SheetFootProps {
  readonly isPlacing: boolean;
  readonly onClose: () => void;
}

const SheetFoot = ({ isPlacing, onClose }: SheetFootProps): ReactElement => (
  <div className="modal-foot">
    <button
      className="btn ghost"
      disabled={isPlacing}
      type="button"
      onClick={onClose}
    >
      {copy.close}
    </button>
  </div>
);

export { SheetFoot };
