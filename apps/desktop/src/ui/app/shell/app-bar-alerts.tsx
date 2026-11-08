import type { AppServerStatus, AttachedApp } from "@design-studio/contracts";
import type { DoctorCause } from "@design-studio/contracts/app-doctor";
import type { ReactElement } from "react";

import { AppBarDoctor } from "./app-bar-doctor";
import { AppFailure } from "./app-failure";

interface AppBarAlertsProps {
  readonly app: AttachedApp;
  readonly cause: DoctorCause | null;
  readonly isFailed: boolean;
  readonly isManaged: boolean;
  readonly onFixed: () => void;
  readonly onHideDoctor: () => void;
  readonly onHideFailure: () => void;
  readonly onLog: () => void;
  readonly onRetry: () => void;
  readonly projectId: string;
  readonly showDoctor: boolean;
  readonly status: AppServerStatus | null;
}

const AppBarAlerts = ({
  app,
  cause,
  isFailed,
  isManaged,
  onFixed,
  onHideDoctor,
  onHideFailure,
  onLog,
  onRetry,
  projectId,
  showDoctor,
  status,
}: AppBarAlertsProps): ReactElement => (
  <>
    {showDoctor && cause && (
      <AppBarDoctor
        cause={cause}
        isManaged={isManaged}
        onClose={onHideDoctor}
        onFixed={onFixed}
        onLog={onLog}
        onRestart={onRetry}
        projectId={projectId}
      />
    )}
    {isFailed && status && (
      <AppFailure
        projectId={projectId}
        app={app}
        status={status}
        onRetry={onRetry}
        onLog={onLog}
        onClose={onHideFailure}
        onSaved={onFixed}
      />
    )}
  </>
);

export { AppBarAlerts };
