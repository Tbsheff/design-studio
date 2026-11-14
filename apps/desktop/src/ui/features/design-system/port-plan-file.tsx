import type { ReactElement } from "react";

import { COPY } from "./copy.js";
import type { PortRouteUpdate } from "./port-model.js";

const PlanFile = ({
  routeFile,
  update,
}: {
  routeFile: string;
  update: PortRouteUpdate | null;
}): ReactElement => (
  <>
    <div className="port-plan-row">
      <span className="port-plan-key">{COPY.textFile}</span>
      <code
        className="port-plan-value port-plan-path mono"
        data-tip={routeFile}
      >
        {update !== null && COPY.textUpdates}
        {routeFile}
      </code>
    </div>
    {update?.isChanged === true && (
      <p className="port-note">{COPY.textRouteChanged}</p>
    )}
  </>
);

export { PlanFile };
