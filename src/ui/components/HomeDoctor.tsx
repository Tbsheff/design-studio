import { useModalDialog } from '../usePopover';
import { CopyButton } from './CopyButton';
import { Icon } from './Icon';

export interface DoctorStep {
  ok: boolean;
  text: string;
}

export interface DoctorProblem {
  name: string;
  place: string;
  badge: { label: string; tone: string };
  steps: DoctorStep[];
  detail: string;
  command: string | null;
}

export default function HomeDoctor({ problem, checking, onCheck, onOpenAnyway, onClose }: { problem: DoctorProblem; checking: boolean; onCheck: () => void; onOpenAnyway: () => void; onClose: () => void }) {
  const dialog = useModalDialog(() => onClose());
  return (
    <dialog ref={dialog.ref} className="modal home-doctor" aria-label={`${problem.name} cannot start yet`} onMouseDown={dialog.onMouseDown}>
      <div className="home-doctor-head">
        <span className={`home-badge ${problem.badge.tone}`}>{problem.badge.label}</span>
        <b>{problem.name}</b>
        <span className="mono truncate">{problem.place}</span>
        <button type="button" className="icon-btn small" aria-label="Close" onClick={onClose}>
          <Icon name="close" size={14} />
        </button>
      </div>
      <ul className="home-doctor-steps" aria-label="Checks">
        {problem.steps.map((step) => (
          <li key={step.text} className={step.ok ? 'ok' : 'bad'}>
            <Icon name={step.ok ? 'check' : 'alert'} size={12} />
            {step.text}
          </li>
        ))}
      </ul>
      <div className="home-doctor-box" role="status">
        <div className="home-doctor-text">
          <Icon name="alert" size={14} />
          <p>{problem.detail}</p>
        </div>
        {problem.command && (
          <div className="home-doctor-cmd">
            <code className="truncate">{problem.command}</code>
            <CopyButton text={problem.command} label="Copy the install command" />
          </div>
        )}
        <div className="home-doctor-actions">
          <button type="button" className="btn small primary" data-autofocus disabled={checking} onClick={onCheck}>
            {checking ? 'Checking…' : 'Check again'}
          </button>
          <div className="spacer" />
          <button type="button" className="btn small ghost" onClick={onOpenAnyway}>
            Open anyway
          </button>
        </div>
      </div>
    </dialog>
  );
}
