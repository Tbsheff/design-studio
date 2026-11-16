import type { ReactElement } from "react";

import { StarterCard } from "./starter-card.js";
import type { StarterId, Workspace } from "./workspace-model.js";
import { toStarters } from "./workspace-model.js";

interface WorkspaceCenterProps {
  readonly defaultLine: string | null;
  readonly isEditApp: boolean;
  readonly onStarter: (id: StarterId) => void;
  readonly workspace: Workspace | null;
}

const WorkspaceCenter = ({
  defaultLine,
  isEditApp,
  onStarter,
  workspace,
}: WorkspaceCenterProps): ReactElement => (
  <>
    <div className="ide-starters">
      {toStarters(workspace).map((starter) => (
        <StarterCard
          isActive={isEditApp && starter.id === "edit"}
          key={starter.id}
          onStarter={onStarter}
          starter={starter}
        />
      ))}
    </div>
    {defaultLine !== null && <p className="ide-default">{defaultLine}</p>}
  </>
);

export { WorkspaceCenter };
