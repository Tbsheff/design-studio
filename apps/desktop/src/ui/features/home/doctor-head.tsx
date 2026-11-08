import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { DoctorProblem } from "./doctor-model.js";

const DoctorHead = ({
  problem,
  onClose,
}: {
  readonly problem: DoctorProblem;
  readonly onClose: () => void;
}): ReactElement => (
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
);

export { DoctorHead };
