import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { WorkspaceNav } from "./use-workspace-nav.js";
import { WorkspaceNode } from "./workspace-node.js";

interface WorkspaceListProps {
  readonly nav: WorkspaceNav;
  readonly onOpen: (projectId: string) => void;
  readonly onOpenRoute: (projectId: string, route: string) => void;
}

const WorkspaceList = ({
  nav,
  onOpen,
  onOpenRoute,
}: WorkspaceListProps): ReactElement => {
  const { onSelect, onToggleGroup, onToggleWorkspace } = nav;

  return (
    <div className="ide-section">
      <div className="ide-group-label">{copy.workspacesGroup}</div>
      {nav.workspaces.map((workspace, index) => (
        <WorkspaceNode
          key={workspace.id}
          index={index}
          isOpen={nav.isOpen(workspace.id)}
          isSelected={index === nav.selectedIndex}
          onOpen={onOpen}
          onOpenRoute={onOpenRoute}
          onSelect={onSelect}
          onToggle={onToggleWorkspace}
          onToggleGroup={onToggleGroup}
          openGroups={nav.openGroups}
          workspace={workspace}
        />
      ))}
    </div>
  );
};

export { WorkspaceList };
