import type { ReactElement } from "react";

import type { SetupStep } from "../../../shared/publish.js";

interface Props {
  step: SetupStep;
}

const MARK: Record<SetupStep["status"], string> = {
  done: "✓",
  failed: "✕",
  pending: "○",
  running: "◌",
  skipped: "–",
};

const BackendStepRow = ({ step }: Props): ReactElement => (
  <li
    className={`publish-setup-step is-${step.status}`}
    data-testid="setup-step"
    data-step={step.id}
    data-status={step.status}
  >
    <span className="publish-setup-mark" aria-hidden="true">
      {MARK[step.status]}
    </span>
    <div className="publish-setup-text">
      <span className="publish-setup-label">{step.label}</span>
      {step.detail && (
        <span className="publish-setup-detail">{step.detail}</span>
      )}
      {step.command && (
        <code className="mono publish-setup-command">{step.command}</code>
      )}
    </div>
  </li>
);

export { BackendStepRow };
