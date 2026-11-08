import { useCallback } from "react";
import type { ReactElement } from "react";

import type { ProjectHit } from "./deps.js";
import { HealthDot } from "./health-dot.js";
import { ProjectThumb } from "./project-thumb.js";
import { toRailTip } from "./rail-model.js";
import { runPickProject } from "./rail-store-model.js";

interface MiniRailItemProps {
  readonly hit: ProjectHit;
  readonly isCurrent: boolean;
}

const MiniRailItem = ({ hit, isCurrent }: MiniRailItemProps): ReactElement => {
  const pick = useCallback((): void => {
    runPickProject(hit.id);
  }, [hit.id]);

  return (
    <button
      type="button"
      className="prail-item prail-mini"
      aria-current={isCurrent && "page"}
      aria-label={toRailTip(hit, isCurrent)}
      data-tip={toRailTip(hit, isCurrent)}
      data-tip-align="start"
      onClick={pick}
    >
      <ProjectThumb hit={hit} />
      <HealthDot hit={hit} />
    </button>
  );
};

export { MiniRailItem };
