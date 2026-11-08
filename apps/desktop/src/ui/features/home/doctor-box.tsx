import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { DoctorActions } from "./doctor-actions.js";
import { DoctorCommand } from "./doctor-command.js";
import type { DoctorProblem } from "./doctor-model.js";

const DoctorBox = ({
  problem,
  isChecking,
  onCheck,
  onOpenAnyway,
}: {
  readonly problem: DoctorProblem;
  readonly isChecking: boolean;
  readonly onCheck: () => void;
  readonly onOpenAnyway: () => void;
}): ReactElement => (
  <output className="home-doctor-box">
    <div className="home-doctor-text">
      <Icon name="alert" size={14} />
      <p>{problem.detail}</p>
    </div>
    {problem.command && <DoctorCommand command={problem.command} />}
    <DoctorActions
      isChecking={isChecking}
      onCheck={onCheck}
      onOpenAnyway={onOpenAnyway}
    />
  </output>
);

export { DoctorBox };
