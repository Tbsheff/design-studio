import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { RecentSection } from "./recent-section.js";
import { StarterCard } from "./starter-card.js";
import type { StarterId, Workspace } from "./workspace-model.js";
import { toRecentIn, toStarters } from "./workspace-model.js";

interface WorkspaceCenterProps {
  readonly onOpen: (projectId: string) => void;
  readonly onStarter: (id: StarterId) => void;
  readonly packName: string | null;
  readonly workspace: Workspace | null;
}

const WorkspaceCenter = ({
  onOpen,
  onStarter,
  packName,
  workspace,
}: WorkspaceCenterProps): ReactElement => (
  <>
    <div className="ide-starters">
      {toStarters(workspace, packName).map((starter) => (
        <StarterCard key={starter.id} onStarter={onStarter} starter={starter} />
      ))}
    </div>
    <RecentSection
      name={workspace?.name ?? copy.prototypesWorkspace}
      onOpen={onOpen}
      projects={toRecentIn(workspace)}
    />
  </>
);

export { WorkspaceCenter };
