import { useCallback } from "react";
import type { ReactElement } from "react";

import type { ProjectHit } from "./deps.js";
import { HealthDot } from "./health-dot.js";
import { ProjectThumb } from "./project-thumb.js";
import { toRowTip } from "./rail-model.js";
import { runPickProject } from "./rail-store-model.js";

interface RailRowProps {
  readonly hit: ProjectHit;
  readonly isCurrent: boolean;
}

const RailRow = ({ hit, isCurrent }: RailRowProps): ReactElement => {
  const pick = useCallback((): void => {
    runPickProject(hit.id);
  }, [hit.id]);

  return (
    <button
      type="button"
      className="prail-item prail-row"
      aria-current={isCurrent && "page"}
      data-tip={toRowTip(hit)}
      data-tip-align="start"
      onClick={pick}
    >
      <ProjectThumb hit={hit} />
      <span className="truncate">{hit.name}</span>
      <HealthDot hit={hit} />
    </button>
  );
};

export { RailRow };
