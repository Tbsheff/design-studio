import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { COPY } from "./copy.js";

const PortDialogHead = ({ onClose }: { onClose: () => void }): ReactElement => (
  <div className="modal-head">
    <div className="titles">
      <h2>{COPY.labelMoveToApp}</h2>
      <p>{COPY.textTheAgentRebuildsThe}</p>
    </div>
    <button
      type="button"
      className="icon-btn"
      aria-label={COPY.labelClose}
      onClick={onClose}
    >
      <Icon name="close" />
    </button>
  </div>
);

export { PortDialogHead };
