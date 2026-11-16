import type { ReactElement } from "react";

import { copy } from "./copy";

interface AppSettingsFootProps {
  readonly onClose: () => void;
  readonly onProject: () => void;
}

const AppSettingsFoot = ({
  onClose,
  onProject,
}: AppSettingsFootProps): ReactElement => (
  <div className="modal-foot">
    <button type="button" className="btn ghost" onClick={onProject}>
      {copy.openProjectSettings}
    </button>
    <button type="button" className="btn primary" onClick={onClose}>
      {copy.done}
    </button>
  </div>
);

export { AppSettingsFoot };
