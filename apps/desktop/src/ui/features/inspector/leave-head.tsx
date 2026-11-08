import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { toUnsavedLabel } from "./use-edit-session.js";

const LeaveHead = ({
  net,
  error,
}: {
  readonly net: number;
  readonly error: string | null;
}): ReactElement => (
  <div className="modal-head">
    <div className="titles">
      <h2 id="edit-leave-title">{copy.leaveTitle}</h2>
      <p id="edit-leave-text">
        {copy.youHave}
        {toUnsavedLabel(net).toLowerCase()}
        {copy.saveVersionKeepsThemAs}
      </p>
      {error && <p className="edit-leave-error">{error}</p>}
    </div>
  </div>
);

export { LeaveHead };
