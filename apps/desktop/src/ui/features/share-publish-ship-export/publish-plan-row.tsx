import type { ReactElement } from "react";

import { pick } from "./pick.js";
import type { PlanRow } from "./publish-plan-model.js";

interface PublishPlanRowProps {
  readonly row: PlanRow;
}

const PublishPlanRow = ({ row }: PublishPlanRowProps): ReactElement => (
  <div className="publish-kv">
    <dt>{row.label}</dt>
    <dd className={pick(row.isMono, "mono", "")}>{row.value}</dd>
  </div>
);

export { PublishPlanRow };
