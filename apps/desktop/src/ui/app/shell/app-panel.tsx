import type { AppServerStatus } from "@design-studio/contracts";
import { envText } from "@design-studio/contracts/app";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { FlowTab } from "../../features/canvas/flow-tab";
import type { AppBarProps } from "./app-bar";
import { AppPanelHead } from "./app-panel-head";
import { AppPanelTabs } from "./app-panel-tabs";
import { envSuggestion } from "./app-settings-model";
import { SettingsTab } from "./app-settings-tab";
import type { Tab } from "./app-tabs";
import { LogsTab } from "./logs-tab";
import { RoutesTab } from "./routes-tab";
import { useEscape } from "./use-app-escape";
import { useAppState } from "./use-app-state";
import { useServerControl } from "./use-server-control";

interface AppPanelProps extends AppBarProps {
  onClose: () => void;
  tab: Tab;
  setTab: (tab: Tab) => void;
  initial: AppServerStatus | null;
}

const AppPanel = ({
  projectId,
  app,
  onAddRoute,
  onClose,
  tab,
  setTab,
  initial,
}: AppPanelProps): ReactElement => {
  const { status, app: fresh, logs, refresh } = useAppState(projectId, initial);
  const managed = (status?.mode ?? app.mode) === "managed";
  const control = useServerControl(projectId, refresh);
  const settingsApp = fresh ?? app;

  const addRoute = useCallback(
    (route: string): void => {
      onAddRoute(route);
      onClose();
    },
    [onAddRoute, onClose]
  );

  useEscape(onClose);

  return (
    <dialog className="app-panel" open aria-label="App">
      <AppPanelHead
        appDir={app.appDir}
        control={control}
        isManaged={managed}
        onClose={onClose}
        status={status}
      />
      <AppPanelTabs onSelect={setTab} tab={tab} />
      {tab === "routes" && (
        <RoutesTab projectId={projectId} onAddRoute={addRoute} />
      )}
      {tab === "flow" && <FlowTab projectId={projectId} />}
      {tab === "logs" && <LogsTab logs={logs} managed={managed} />}
      {tab === "settings" && (
        <SettingsTab
          key={envText(settingsApp.env)}
          projectId={projectId}
          app={settingsApp}
          suggested={envSuggestion(status)}
          onSaved={refresh}
        />
      )}
    </dialog>
  );
};

export { AppPanel };
