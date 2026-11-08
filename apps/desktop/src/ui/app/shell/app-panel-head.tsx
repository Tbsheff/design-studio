import type { AppServerStatus } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { AppPanelTitle } from "./app-panel-title";
import type { ServerAction } from "./server-action-button";
import { ServerButtons } from "./server-buttons";

interface AppPanelHeadProps {
  readonly appDir: string;
  readonly control: (action: ServerAction) => void;
  readonly isManaged: boolean;
  readonly onClose: () => void;
  readonly status: AppServerStatus | null;
}

const AppPanelHead = ({
  appDir,
  control,
  isManaged,
  onClose,
  status,
}: AppPanelHeadProps): ReactElement => {
  const state = status?.state ?? "idle";

  return (
    <div className="app-panel-head">
      <span className="app-status-dot" data-state={state} />
      <AppPanelTitle appDir={appDir} isManaged={isManaged} status={status} />
      <ServerButtons state={state} managed={isManaged} control={control} />
      <button
        type="button"
        className="icon-btn"
        aria-label="Close"
        onClick={onClose}
      >
        <Icon name="close" size={14} />
      </button>
    </div>
  );
};

export { AppPanelHead };
