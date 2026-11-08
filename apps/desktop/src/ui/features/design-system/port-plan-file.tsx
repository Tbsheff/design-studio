import type { ReactElement } from "react";

import { COPY } from "./copy.js";

const PlanFile = ({ routeFile }: { routeFile: string }): ReactElement => (
  <div className="port-plan-row">
    <span className="port-plan-key">{COPY.textFile}</span>
    <code className="port-plan-value mono truncate">{routeFile}</code>
  </div>
);

export { PlanFile };
