import type { AppServerStatus } from "@design-studio/contracts";
import { envText } from "@design-studio/contracts/app";
import { Icon } from "@design-studio/ui";
import { useTransition } from "react";

import { api } from "../../api";
import FlowTab from "../../features/canvas/flow-tab";
import type { AppBarProps } from "./app-bar";
import { envSuggestion, SettingsTab } from "./app-settings-tab";
import { statusLine } from "./app-state-text";
import { TABS } from "./app-tabs";
import type { Tab } from "./app-tabs";
import { LogsTab } from "./logs-tab";
import { RoutesTab } from "./routes-tab";
import { ServerButtons } from "./server-buttons";
import { useEscape } from "./use-app-escape";
import { useAppState } from "./use-app-state";

const AppPanel = ({
  projectId,
  app,
  onAddRoute,
  onClose,
  tab,
  setTab,
  initial,
}: AppBarProps & {
  onClose: () => void;
  tab: Tab;
  setTab: (tab: Tab) => void;
  initial: AppServerStatus | null;
}) => {
  const {
    status,
    app: fresh,
    logs,
    refresh,
  } = useAppState(projectId, true, initial);

  const state = status?.state ?? "idle";
  const managed = (status?.mode ?? app.mode) === "managed";

  const [, startTransition] = useTransition();

  const control = (action: "start" | "stop" | "restart") => {
    startTransition(async () => {
      try {
        await api.appControl(projectId, action);
        refresh();
      } catch {
        refresh();
      }
    });
  };

  const settingsApp = fresh ?? app;

  const addRoute = (route: string) => {
    onAddRoute(route);
    onClose();
  };

  useEscape(onClose);

  return (
    <div className="app-panel" role="dialog" aria-label="App">
      <div className="app-panel-head">
        <span className="app-status-dot" data-state={state} />
        <div className="grow">
          <div className="app-panel-title">
            {app.appDir === "." ? (
              "App folder"
            ) : (
              <span className="mono">{app.appDir}</span>
            )}
          </div>
          <div className="app-panel-sub">{statusLine(status, managed)}</div>
          {status?.message && (
            <div className="app-panel-sub app-panel-message">
              {status.message}
            </div>
          )}
        </div>
        <ServerButtons state={state} managed={managed} control={control} />
        <button
          type="button"
          className="icon-btn"
          aria-label="Close"
          onClick={onClose}
        >
          <Icon name="close" size={14} />
        </button>
      </div>
      <div className="app-panel-tabs segmented" role="tablist">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={tab === item.id ? "on" : ""}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
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
    </div>
  );
};

export { AppPanel };
