import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import type { DoctorStep } from "./doctor-model.js";

const DoctorStepRow = ({
  step,
}: {
  readonly step: DoctorStep;
}): ReactElement => {
  if (step.isOk) {
    return (
      <li className="ok">
        <Icon name="check" size={12} />
        {step.text}
      </li>
    );
  }

  return (
    <li className="bad">
      <Icon name="alert" size={12} />
      {step.text}
    </li>
  );
};

export { DoctorStepRow };
