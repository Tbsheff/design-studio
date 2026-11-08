import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

const TrashHead = ({
  onClose,
}: {
  readonly onClose: () => void;
}): ReactElement => (
  <div className="modal-head">
    <div className="titles">
      <h2 id="trash-title">{copy.trash}</h2>
      <p>{copy.restoreADeletedProjectOr}</p>
    </div>
    <button
      type="button"
      className="icon-btn"
      aria-label={copy.closeTrash}
      onClick={onClose}
    >
      <Icon name="close" />
    </button>
  </div>
);

export { TrashHead };
