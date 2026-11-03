import { lazy, Suspense, useState } from "react";

import type { AttachedApp } from "../../../shared/contracts";
import { api } from "../../api";
import { AppBarAccount } from "./app-bar-account.js";
import { AppFailure } from "./app-failure";
import { AppPanel } from "./app-panel";
import { stateText } from "./app-state-text";
import type { Tab } from "./app-tabs";
import { PrepChip } from "./prep-chip";
import { usePanelFocus, useOpenRequests, useAlerts } from "./use-app-alerts";
import { useAppState } from "./use-app-state";

import "../../styles/attach-app.css";

const DoctorCard = lazy(async () => {
  const loaded = await import("../../features/design-system/doctor-card");

  return { default: loaded.DoctorCard };
});

export interface AppBarProps {
  projectId: string;
  app: AttachedApp;
  onAddRoute: (route: string) => void;
}

export default function AppBar({ projectId, app, onAddRoute }: AppBarProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("routes");
  const { status, firstVersion, refresh } = useAppState(projectId, false);
  const state = status?.state ?? "idle";
  const managed = (status?.mode ?? app.mode) === "managed";
  const focus = usePanelFocus(setOpen);
  useOpenRequests(setTab, setOpen, focus.remember);

  const { cause, doctorKey, showDoctor, failKey, failed, setHidden } =
    useAlerts(status, open);

  const retry = () =>
    void api
      .appControl(projectId, managed ? "restart" : "start")
      .then(refresh)
      .catch(() => undefined);

  const showLog = () => {
    setTab("logs");
    setOpen(true);
  };

  return (
    <div className="app-bar-root">
      <AppBarAccount />
      {showDoctor && cause && (
        <Suspense fallback={null}>
          <DoctorCard
            projectId={projectId}
            cause={cause}
            onFixed={refresh}
            onLog={showLog}
            onClose={() => setHidden(doctorKey)}
            onRestart={managed ? retry : undefined}
          />
        </Suspense>
      )}
      {failed && status && (
        <AppFailure
          projectId={projectId}
          app={app}
          status={status}
          onRetry={retry}
          onLog={showLog}
          onClose={() => setHidden(failKey)}
          onSaved={refresh}
        />
      )}
      <button
        type="button"
        className="btn small app-bar-button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => {
          focus.remember();
          setOpen((v) => !v);
        }}
        data-tip="Routes, dev server and log"
      >
        <span className="app-status-dot" data-state={state} />
        <span>{app.framework === "next" ? "Next.js" : "App"}</span>
        <span className="app-panel-sub">{stateText(status, managed)}</span>
        <PrepChip firstVersion={firstVersion} />
      </button>
      {open && (
        <AppPanel
          projectId={projectId}
          app={app}
          onAddRoute={onAddRoute}
          onClose={focus.close}
          tab={tab}
          setTab={setTab}
          initial={status}
        />
      )}
    </div>
  );
}
