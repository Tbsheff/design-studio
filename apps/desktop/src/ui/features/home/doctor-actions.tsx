import type { ReactElement } from "react";

import { copy } from "./copy.js";

const DoctorActions = ({
  isChecking,
  onCheck,
  onOpenAnyway,
}: {
  readonly isChecking: boolean;
  readonly onCheck: () => void;
  readonly onOpenAnyway: () => void;
}): ReactElement => (
  <div className="home-doctor-actions">
    <button
      type="button"
      className="btn small primary"
      data-autofocus
      disabled={isChecking}
      onClick={onCheck}
    >
      {isChecking && "Checking…"}
      {!isChecking && "Check again"}
    </button>
    <div className="spacer" />
    <button type="button" className="btn small ghost" onClick={onOpenAnyway}>
      {copy.openAnyway}
    </button>
  </div>
);

export { DoctorActions };
