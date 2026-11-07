import { CopyButton, Icon, useModalDialog } from "@design-studio/ui";

import { copy } from "./copy.js";

export interface DoctorStep {
  readonly isOk: boolean;
  readonly text: string;
}

export interface DoctorProblem {
  readonly name: string;
  readonly place: string;
  readonly badge: { readonly label: string; readonly tone: string };
  readonly steps: DoctorStep[];
  readonly detail: string;
  readonly command: string | null;
}

export default function HomeDoctor({
  problem,
  isChecking,
  onCheck,
  onOpenAnyway,
  onClose,
}: {
  readonly problem: DoctorProblem;
  readonly isChecking: boolean;
  readonly onCheck: () => void;
  readonly onOpenAnyway: () => void;
  readonly onClose: () => void;
}) {
  const dialog = useModalDialog(() => onClose());
  return (
    <dialog
      ref={dialog.ref}
      className="modal home-doctor"
      aria-label={`${problem.name} cannot start yet`}
      onMouseDown={dialog.onMouseDown}
    >
      <div className="home-doctor-head">
        <span className={`home-badge ${problem.badge.tone}`}>
          {problem.badge.label}
        </span>
        <b>{problem.name}</b>
        <span className="mono truncate">{problem.place}</span>
        <button
          type="button"
          className="icon-btn small"
          aria-label={copy.close}
          onClick={onClose}
        >
          <Icon name="close" size={14} />
        </button>
      </div>
      <ul className="home-doctor-steps" aria-label={copy.checks}>
        {problem.steps.map((step) => (
          <li key={step.text} className={step.isOk ? "ok" : "bad"}>
            <Icon name={step.isOk ? "check" : "alert"} size={12} />
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
            <CopyButton
              text={problem.command}
              label="Copy the install command"
            />
          </div>
        )}
        <div className="home-doctor-actions">
          <button
            type="button"
            className="btn small primary"
            data-autofocus
            disabled={isChecking}
            onClick={onCheck}
          >
            {isChecking ? "Checking…" : "Check again"}
          </button>
          <div className="spacer" />
          <button
            type="button"
            className="btn small ghost"
            onClick={onOpenAnyway}
          >
            Open anyway
          </button>
        </div>
      </div>
    </dialog>
  );
}
