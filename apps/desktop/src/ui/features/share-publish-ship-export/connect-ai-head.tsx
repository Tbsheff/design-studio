import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy as uiCopy } from "./copy.js";

interface ConnectAiHeadProps {
  readonly onClose: () => void;
}

const ConnectAiHead = ({ onClose }: ConnectAiHeadProps): ReactElement => (
  <div className="modal-head">
    <div className="titles">
      <h2>{uiCopy.connectAi}</h2>
      <p>{uiCopy.connectAiLede}</p>
    </div>
    <button
      type="button"
      className="icon-btn"
      aria-label={uiCopy.closeConnectAi}
      onClick={onClose}
    >
      <Icon name="close" />
    </button>
  </div>
);

export { ConnectAiHead };
