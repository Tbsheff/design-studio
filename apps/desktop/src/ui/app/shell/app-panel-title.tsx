import type { AppServerStatus } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { statusLine } from "./app-state-text";

interface AppPanelTitleProps {
  readonly appDir: string;
  readonly isManaged: boolean;
  readonly status: AppServerStatus | null;
}

const AppPanelTitle = ({
  appDir,
  isManaged,
  status,
}: AppPanelTitleProps): ReactElement => (
  <div className="grow">
    <div className="app-panel-title">
      {appDir === "." && "App folder"}
      {appDir !== "." && <span className="mono">{appDir}</span>}
    </div>
    <div className="app-panel-sub">{statusLine(status, isManaged)}</div>
    {status?.message && (
      <div className="app-panel-sub app-panel-message">{status.message}</div>
    )}
  </div>
);

export { AppPanelTitle };
