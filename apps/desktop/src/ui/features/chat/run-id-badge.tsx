import type { ReactElement } from "react";

import { copy } from "./copy.js";

const RunIdBadge = ({ runId }: { runId: string }): ReactElement => (
  <div className="drawer-id" data-tip={runId}>
    <span className="badge">{copy.run}</span>
    <span className="mono muted truncate">{runId}</span>
  </div>
);

export { RunIdBadge };
