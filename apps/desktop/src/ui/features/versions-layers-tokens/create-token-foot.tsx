import type { ReactNode } from "react";

import { COPY } from "./copy.js";

interface CreateTokenFootProps {
  readonly isBusy: boolean;
  readonly isTouchedInvalid: boolean;
  readonly onClose: () => void;
}

const CreateTokenFoot = ({
  isBusy,
  isTouchedInvalid,
  onClose,
}: CreateTokenFootProps): ReactNode => {
  let submitLabel: string = COPY.tokenCreateTitle;

  if (isBusy) {
    submitLabel = COPY.tokenCreating;
  }

  return (
    <div className="modal-foot">
      <button
        type="button"
        className="btn ghost"
        onClick={onClose}
        disabled={isBusy}
      >
        {COPY.tokenCancel}
      </button>
      <button
        type="submit"
        className="btn primary"
        disabled={isBusy || isTouchedInvalid}
      >
        {submitLabel}
      </button>
    </div>
  );
};

export { CreateTokenFoot };
