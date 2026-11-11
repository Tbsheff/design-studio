import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { RecentSection } from "./recent-section.js";
import { StarterCard } from "./starter-card.js";
import type { StarterId, Workspace } from "./workspace-model.js";
import { toRecentIn, toStarters } from "./workspace-model.js";

interface WorkspaceCenterProps {
  readonly defaultLine: string | null;
  readonly isEditApp: boolean;
  readonly onOpen: (projectId: string) => void;
  readonly onStarter: (id: StarterId) => void;
  readonly workspace: Workspace | null;
}

const WorkspaceCenter = ({
  defaultLine,
  isEditApp,
  onOpen,
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
    <RecentSection
      name={workspace?.name ?? copy.prototypesWorkspace}
      onOpen={onOpen}
      projects={toRecentIn(workspace)}
    />
  </>
);

export { WorkspaceCenter };
