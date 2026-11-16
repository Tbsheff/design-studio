import type { ReactElement } from "react";

import { pick } from "../../platform/pick.js";
import { copy } from "./copy.js";

interface Props {
  readonly isDisabled: boolean;
  readonly isPending: boolean;
  readonly onClose: () => void;
}

const FigmaImportFoot = ({
  isDisabled,
  isPending,
  onClose,
}: Props): ReactElement => (
  <div className="modal-foot">
    <button
      type="button"
      className="btn ghost"
      onClick={onClose}
      disabled={isPending}
    >
      {copy.cancel}
    </button>
    <button
      type="submit"
      className="btn primary"
      disabled={isPending || isDisabled}
    >
      {pick(isPending, copy.importingEllipsis, copy.importFrame)}
    </button>
  </div>
);

export { FigmaImportFoot };
