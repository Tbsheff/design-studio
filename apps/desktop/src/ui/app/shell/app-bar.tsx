import type { AttachedApp } from "@design-studio/contracts";
import { useCallback, useState } from "react";
import type { ReactElement } from "react";

import { AppBarAccount } from "./app-bar-account.js";
import { AppBarAlerts } from "./app-bar-alerts";
import { AppBarToggle } from "./app-bar-toggle";
import { AppPanel } from "./app-panel";
import { stateText } from "./app-state-text";
import type { Tab } from "./app-tabs";
import { usePanelFocus, useOpenRequests, useAlerts } from "./use-app-alerts";
import { useAppBarActions } from "./use-app-bar-actions";
import { useAppState } from "./use-app-state";

interface AppBarProps {
  projectId: string;
  app: AttachedApp;
  onAddRoute: (route: string) => void;
}

const AppBar = ({ projectId, app, onAddRoute }: AppBarProps): ReactElement => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("routes");
  const { status, firstVersion, refresh } = useAppState(projectId);
  const state = status?.state ?? "idle";
  const managed = (status?.mode ?? app.mode) === "managed";
  const { close, remember } = usePanelFocus(setOpen);

  useOpenRequests(setTab, setOpen, remember);

  const { cause, doctorKey, showDoctor, failKey, failed, setHidden } =
    useAlerts(status, open);

  const { retry, showLog, toggle } = useAppBarActions({
    isManaged: managed,
    projectId,
    refresh,
    remember,
    setOpen,
    setTab,
  });

  const hideDoctor = useCallback(
    () => setHidden(doctorKey),
    [doctorKey, setHidden]
  );

  const hideFailure = useCallback(
    () => setHidden(failKey),
    [failKey, setHidden]
  );

  return (
    <div className="app-bar-root">
      <AppBarAccount />
      <AppBarAlerts
        app={app}
        cause={cause}
        isFailed={failed}
        isManaged={managed}
        onFixed={refresh}
        onHideDoctor={hideDoctor}
        onHideFailure={hideFailure}
        onLog={showLog}
        onRetry={retry}
        projectId={projectId}
        showDoctor={showDoctor}
        status={status}
      />
      <AppBarToggle
        firstVersion={firstVersion}
        framework={app.framework}
        isOpen={open}
        onToggle={toggle}
        state={state}
        statusText={stateText(status, managed)}
      />
      {open && (
        <AppPanel
          projectId={projectId}
          app={app}
          onAddRoute={onAddRoute}
          onClose={close}
          tab={tab}
          setTab={setTab}
          initial={status}
        />
      )}
    </div>
  );
};

export { AppBar };

export type { AppBarProps };
