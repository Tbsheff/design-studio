import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy";

interface AppSettingsHeadProps {
  readonly onClose: () => void;
}

const AppSettingsHead = ({ onClose }: AppSettingsHeadProps): ReactElement => (
  <div className="modal-head">
    <div className="titles">
      <h2>{copy.settings}</h2>
      <p>{copy.settingsSubtitle}</p>
    </div>
    <button
      type="button"
      className="icon-btn"
      aria-label={copy.closeSettings}
      onClick={onClose}
    >
      <Icon name="close" />
    </button>
  </div>
);

export { AppSettingsHead };
