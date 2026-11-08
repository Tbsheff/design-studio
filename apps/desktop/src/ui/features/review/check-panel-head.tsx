import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

interface Props {
  onClose: () => void;
}

const CheckPanelHead = ({ onClose }: Props): ReactElement => (
  <div className="check-head">
    <Icon name="scan" />
    <strong>{copy.renderCheck}</strong>
    <div className="spacer" />
    <button
      type="button"
      className="icon-btn"
      aria-label={copy.close}
      onClick={onClose}
    >
      <Icon name="close" />
    </button>
  </div>
);

export { CheckPanelHead };
