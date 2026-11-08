import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { DoctorBox } from "./doctor-box.js";
import { DoctorHead } from "./doctor-head.js";
import type { DoctorProblem } from "./doctor-model.js";
import { DoctorStepRow } from "./doctor-step-row.js";
import { useHomeDialog } from "./use-home-dialog.js";

const HomeDoctor = ({
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
}): ReactElement => {
  const handleDismiss = useCallback((): boolean => {
    onClose();

    return true;
  }, [onClose]);

  const ref = useHomeDialog(handleDismiss);

  return (
    <dialog
      ref={ref}
      className="modal home-doctor"
      aria-label={`${problem.name} cannot start yet`}
    >
      <DoctorHead problem={problem} onClose={onClose} />
      <ul className="home-doctor-steps" aria-label={copy.checks}>
        {problem.steps.map((step) => (
          <DoctorStepRow key={step.text} step={step} />
        ))}
      </ul>
      <DoctorBox
        problem={problem}
        isChecking={isChecking}
        onCheck={onCheck}
        onOpenAnyway={onOpenAnyway}
      />
    </dialog>
  );
};

export { HomeDoctor };
