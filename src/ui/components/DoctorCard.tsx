import { useState } from 'react';
import type { DoctorCause } from '../../shared/app-doctor';
import { api, errorText } from '../api';
import { CopyButton } from './CopyButton';
import { Icon } from './Icon';

interface DoctorCardProps {
  projectId: string;
  cause: DoctorCause;
  onFixed: () => void;
  onLog: () => void;
  onClose: () => void;
}

export default function DoctorCard({ projectId, cause, onFixed, onLog, onClose }: DoctorCardProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fix = () => {
    setBusy(true);
    setError(null);
    api
      .appFix(projectId, cause.kind)
      .then(onFixed)
      .catch((err: unknown) => {
        setError(errorText(err));
        setBusy(false);
      });
  };
  return (
    <div className="app-fail app-doctor" role="alert" data-kind={cause.kind}>
      <div className="app-fail-head">
        <Icon name="alert" size={14} />
        <strong className="grow">{cause.title}</strong>
        <button type="button" className="icon-btn small" aria-label="Dismiss" data-tip="Dismiss" onClick={onClose}>
          <Icon name="close" size={12} />
        </button>
      </div>
      <p className="app-fail-message">{cause.detail}</p>
      {cause.evidence[0] && (
        <span className="app-doctor-evidence" data-tip={cause.evidence.join('\n')} data-tip-align="start">
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
        {cause.fix && (
          <button type="button" className="btn small primary" disabled={busy} onClick={fix}>
            {busy ? 'Restarting…' : cause.fix.label}
          </button>
        )}
      </div>
    </div>
  );
}
