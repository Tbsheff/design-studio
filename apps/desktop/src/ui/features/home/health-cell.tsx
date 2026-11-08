import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { AppHealth } from "./deps.js";
import { HEALTH_TEXT } from "./project-card-model.js";

interface HealthCellProps {
  readonly health: AppHealth | null;
  readonly hasRunFailed: boolean;
}

const HealthCell = ({
  health,
  hasRunFailed,
}: HealthCellProps): ReactElement | null => {
  const state = health?.state ?? "static";

  if (hasRunFailed && state !== "install" && state !== "failed") {
    return (
      <span
        className="project-health run-failed"
        data-tip={copy.theLastAiRunFailed}
      >
        <span className="project-dot" aria-hidden="true" />
        {copy.lastRunFailed}
      </span>
    );
  }

  if (state === "static") {
    return null;
  }

  return (
    <span
      className={`project-health ${state}`}
      data-tip={health?.title ?? null}
    >
      <span className="project-dot" aria-hidden="true" />
      {HEALTH_TEXT[state]}
    </span>
  );
};

export { HealthCell };
