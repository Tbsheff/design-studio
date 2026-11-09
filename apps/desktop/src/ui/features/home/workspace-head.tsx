import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { toWorkspaceSub } from "./workspace-model.js";
import type { Workspace } from "./workspace-model.js";

interface WorkspaceHeadProps {
  readonly homeDir: string | null;
  readonly packName: string | null;
  readonly workspace: Workspace | null;
}

const WorkspaceHead = ({
  homeDir,
  packName,
  workspace,
}: WorkspaceHeadProps): ReactElement => {
  if (workspace === null) {
    return (
      <div className="ide-head">
        <h1>{copy.prototypesWorkspace}</h1>
        <p>{copy.prototypesSub}</p>
      </div>
    );
  }

  return (
    <div className="ide-head">
      <h1>{workspace.name}</h1>
      <p>{toWorkspaceSub(workspace, homeDir, packName)}</p>
    </div>
  );
};

export { WorkspaceHead };
