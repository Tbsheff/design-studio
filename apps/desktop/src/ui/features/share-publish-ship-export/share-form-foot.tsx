import type { ReactElement } from "react";

import { pick } from "../../platform/pick.js";
import { copy } from "./copy.js";

interface ShareFormFootProps {
  readonly isBusy: boolean;
  readonly canCreate: boolean;
  readonly onClose: () => void;
}

const ShareFormFoot = ({
  canCreate,
  isBusy,
  onClose,
}: ShareFormFootProps): ReactElement => (
  <div className="modal-foot">
    <span className="share-foot-note">{copy.noUploadLinksWork}</span>
    <span className="share-spacer" />
    <button type="button" className="btn ghost" onClick={onClose}>
      {copy.close}
    </button>
    <button
      type="submit"
      className="btn primary"
      disabled={!canCreate}
      data-autofocus
    >
      {pick(isBusy, copy.working, copy.createLink)}
    </button>
  </div>
);

export { ShareFormFoot };
