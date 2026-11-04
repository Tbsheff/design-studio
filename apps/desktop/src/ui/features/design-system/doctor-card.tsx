import { routes as studioRoutes } from "@design-studio/actions/studio/routes";
import type { DoctorCause } from "@design-studio/contracts/app-doctor";
import { CopyButton, Icon } from "@design-studio/ui";
import type { ReactElement } from "react";
import { useEffect, useState, useTransition } from "react";

import { api, errorText } from "../../api.js";
import { call } from "../../platform/http.js";
import { COPY } from "./copy.js";

interface DoctorCardProps {
  projectId: string;
  cause: DoctorCause;
  onFixed: () => void;
  onLog: () => void;
  onClose: () => void;
  onRestart?: (() => void) | undefined;
}

const DoctorCard = ({
  projectId,
  cause,
  onFixed,
  onLog,
  onClose,
  onRestart,
}: DoctorCardProps): ReactElement => {
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState<string | null>(null);
  useEffect(() => {
    let live = true;

    const read = async () => {
      try {
        const health = await call(studioRoutes.healthStudio, {});

        if (live) {
          setVersion(health.version);
        }
      } catch {
        if (live) {
          setVersion(null);
        }
      }
    };

    void read();

    return () => {
      live = false;
    };
  }, []);

  const fix = () => {
    setError(null);
    startTransition(async () => {
      try {
        await api.appFix(projectId, cause.kind);
        onFixed();
      } catch (caught: unknown) {
        setError(errorText(caught));
      }
    });
  };

  return (
    <div className="app-fail app-doctor" role="alert" data-kind={cause.kind}>
      <div className="app-fail-head">
        <Icon name="alert" size={14} />
        <strong className="grow">{cause.title}</strong>
        <button
          type="button"
          className="icon-btn small"
          aria-label={COPY.labelDismiss}
          data-tip={COPY.tipDismiss}
          onClick={onClose}
        >
          <Icon name="close" size={12} />
        </button>
      </div>
      <p className="app-fail-message">{cause.detail}</p>
      {cause.evidence[0] && (
        <span
          className="app-doctor-evidence"
          data-tip={cause.evidence.join("\n")}
          data-tip-align="start"
        >
          <code className="truncate">{cause.evidence[0]}</code>
        </span>
      )}
      {cause.command && (
        <div className="app-fail-cmd">
          <code className="truncate">{cause.command}</code>
          <CopyButton text={cause.command} label="Copy the command" />
        </div>
      )}
      {error && <span className="app-fail-error">{error}</span>}
      <div className="app-fail-foot">
        <button type="button" className="btn small ghost" onClick={onLog}>
          Show the log
        </button>
        <span className="grow" />
        {version && (
          <span className="mono" data-tip={COPY.tipDesignStudioVersion}>
            v{version}
          </span>
        )}
        {cause.fix && (
          <button
            type="button"
            className="btn small primary"
            disabled={busy}
            onClick={fix}
          >
            {busy ? "Restarting…" : cause.fix.label}
          </button>
        )}
        {!cause.fix && onRestart && cause.severity === "error" && (
          <button
            type="button"
            className="btn small primary"
            onClick={onRestart}
          >
            Restart dev server
          </button>
        )}
      </div>
    </div>
  );
};

export { DoctorCard };

export type { DoctorCardProps };
