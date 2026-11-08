import type { AppServerStatus, AttachedApp } from "@design-studio/contracts";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { pick } from "../../platform/pick.js";
import { AppFailureHead } from "./app-failure-head";
import { InstallFix } from "./install-fix";
import { UrlForm } from "./url-form";
import { useInstallHint } from "./use-install-hint";

interface AppFailureProps {
  projectId: string;
  app: AttachedApp;
  status: AppServerStatus;
  onRetry: () => void;
  onLog: () => void;
  onClose: () => void;
  onSaved: () => void;
}

const SUGGESTED_URL = /runs for this app at (?<appPath>\S+?)\.(?:\s|$)/u;

const toSuggestedUrl = (message: string | null): string =>
  SUGGESTED_URL.exec(message ?? "")?.groups?.appPath ?? "";

const AppFailure = ({
  projectId,
  app,
  status,
  onRetry,
  onLog,
  onClose,
  onSaved,
}: AppFailureProps): ReactElement => {
  const managed = status.mode === "managed";
  const { hint, reload } = useInstallHint(projectId, app, managed);

  const retry = useCallback((): void => {
    reload();
    onRetry();
  }, [onRetry, reload]);

  return (
    <div className="app-fail" role="alert">
      <AppFailureHead
        onClose={onClose}
        title={pick(
          managed,
          "The dev server did not start",
          "Your dev server does not answer"
        )}
      />
      {status.message && <p className="app-fail-message">{status.message}</p>}
      {managed && <InstallFix hint={hint} />}
      <UrlForm
        projectId={projectId}
        app={app}
        suggested={toSuggestedUrl(status.message ?? null)}
        onSaved={onSaved}
      />
      <div className="app-fail-foot">
        <button type="button" className="btn small ghost" onClick={onLog}>
          {pick(managed, "Show the log", "Show details")}
        </button>
        <span className="grow" />
        <button type="button" className="btn small primary" onClick={retry}>
          {pick(managed, "Restart dev server", "Check again")}
        </button>
      </div>
    </div>
  );
};

export { AppFailure };
