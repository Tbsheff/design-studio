import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy";

interface SettingsModalHeadProps {
  readonly onClose: () => void;
}

const SettingsModalHead = ({
  onClose,
}: SettingsModalHeadProps): ReactElement => (
  <div className="modal-head">
    <div className="titles">
      <h2>{copy.projectSettings}</h2>
      <p>{copy.appliesToTheNextRun}</p>
    </div>
    <button
      type="button"
      className="icon-btn"
      aria-label="Close settings"
      onClick={onClose}
    >
      <Icon name="close" />
    </button>
  </div>
);

export { SettingsModalHead };
