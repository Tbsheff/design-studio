import type { ReactElement } from "react";
import { useCallback } from "react";

import { copy } from "./copy.js";
import { ProjectGroup } from "./project-group.js";
import { ScreensGroup } from "./screens-group.js";
import { TreeBranch } from "./tree-branch.js";
import { toWorkspaceKey } from "./workspace-model.js";
import type { Workspace } from "./workspace-model.js";

interface WorkspaceNodeProps {
  readonly index: number;
  readonly isOpen: boolean;
  readonly isSelected: boolean;
  readonly onOpen: (projectId: string) => void;
  readonly onOpenRoute: (projectId: string, route: string) => void;
  readonly onSelect: (index: number) => void;
  readonly onToggle: (id: string) => void;
  readonly onToggleGroup: (key: string) => void;
  readonly openGroups: ReadonlySet<string>;
  readonly workspace: Workspace;
}

const WorkspaceNode = ({
  index,
  isOpen,
  isSelected,
  onOpen,
  onOpenRoute,
  onSelect,
  onToggle,
  onToggleGroup,
  openGroups,
  workspace,
}: WorkspaceNodeProps): ReactElement => {
  const { app, id } = workspace;

  const handleWorkspacePick = useCallback((): void => {
    if (isSelected) {
      onToggle(id);

      return;
    }

    onSelect(index);
  }, [id, index, isSelected, onSelect, onToggle]);

  const systemsKey = `${id}:systems`;
  const screensKey = `${id}:screens`;
  const prototypesKey = `${id}:prototypes`;

  return (
    <div className="ide-node">
      <TreeBranch
        depth={0}
        isExpanded={isOpen}
        isSelected={isSelected}
        meta={toWorkspaceKey(index)}
        onClick={handleWorkspacePick}
      >
        {workspace.name}
      </TreeBranch>
      {isOpen && (
        <>
          <ProjectGroup
            groupKey={systemsKey}
            isOpen={openGroups.has(systemsKey)}
            label={copy.designSystemsGroup}
            onOpen={onOpen}
            onToggle={onToggleGroup}
            projects={workspace.designSystems}
          />
          {app !== null && (
            <ScreensGroup
              groupKey={screensKey}
              isOpen={openGroups.has(screensKey)}
              onOpenRoute={onOpenRoute}
              onToggle={onToggleGroup}
              projectId={app.id}
            />
          )}
          <ProjectGroup
            groupKey={prototypesKey}
            isOpen={openGroups.has(prototypesKey)}
            label={copy.prototypesGroup}
            onOpen={onOpen}
            onToggle={onToggleGroup}
            projects={workspace.prototypes}
          />
        </>
      )}
    </div>
  );
};

export { WorkspaceNode };
