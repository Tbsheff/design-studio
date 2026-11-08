import type { DoctorCause } from "@design-studio/contracts/app-doctor";
import { CopyButton } from "@design-studio/ui";
import type { ReactElement } from "react";
import { useCallback, useState, useTransition } from "react";

import { api, errorText } from "../../api.js";
import { DoctorCardFoot } from "./doctor-card-foot.js";
import { DoctorCardHead } from "./doctor-card-head.js";
import { useDoctorVersion } from "./use-doctor-version.js";

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
  const [isBusy, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const version = useDoctorVersion();

  const fix = useCallback((): void => {
    setMessage(null);
    startTransition(async () => {
      try {
        await api.appFix(projectId, cause.kind);
        onFixed();
      } catch (error: unknown) {
        setMessage(errorText(error));
      }
    });
  }, [cause.kind, onFixed, projectId]);

  return (
    <div className="app-fail app-doctor" role="alert" data-kind={cause.kind}>
      <DoctorCardHead onClose={onClose} title={cause.title} />
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
      {message && <span className="app-fail-error">{message}</span>}
      <DoctorCardFoot
        cause={cause}
        isBusy={isBusy}
        onFix={fix}
        onLog={onLog}
        onRestart={onRestart}
        version={version}
      />
    </div>
  );
};

export { DoctorCard };

export type { DoctorCardProps };
