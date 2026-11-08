import type { ReactElement } from "react";

import type { ProjectHit } from "./deps.js";
import { toClassName } from "./thumb-class-model.js";

const HealthDot = ({
  hit,
  className,
}: {
  readonly hit: ProjectHit;
  readonly className?: string;
}): ReactElement | null => {
  if (!hit.health) {
    return null;
  }

  return (
    <span
      className={toClassName("pnav-dot", className ?? null)}
      data-level={hit.health.level}
      data-tip={hit.health.note}
    >
      <span className="sr-only">{hit.health.note}</span>
    </span>
  );
};

export { HealthDot };
