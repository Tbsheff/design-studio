import type { ReactElement } from "react";

import { PermissionEntry } from "./permission-entry.js";
import { runProjectId } from "./run-history-model.js";
import type { RunView } from "./run-state-model.js";

const RunPermissions = ({ run }: { run: RunView }): ReactElement => (
  <>
    {run.permissions.map((request) => (
      <PermissionEntry
        key={request.id}
        projectId={runProjectId()}
        runId={run.runId}
        request={request}
      />
    ))}
  </>
);

export { RunPermissions };
