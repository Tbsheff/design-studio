import type { Project } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { ProjectTreeRow } from "./project-tree-row.js";
import { WorkspaceGroup } from "./workspace-group.js";

interface ProjectGroupProps {
  readonly groupKey: string;
  readonly isOpen: boolean;
  readonly label: string;
  readonly onOpen: (projectId: string) => void;
  readonly onToggle: (key: string) => void;
  readonly projects: readonly Project[];
}

const ProjectGroup = ({
  groupKey,
  isOpen,
  label,
  onOpen,
  onToggle,
  projects,
}: ProjectGroupProps): ReactElement => (
  <WorkspaceGroup
    count={projects.length}
    groupKey={groupKey}
    isOpen={isOpen}
    label={label}
    onToggle={onToggle}
  >
    {projects.map((project) => (
      <ProjectTreeRow
        key={project.id}
        depth={2}
        isPinned={false}
        meta={null}
        onOpen={onOpen}
        project={project}
      />
    ))}
    {projects.length === 0 && <p className="ide-empty">{copy.noneYet}</p>}
  </WorkspaceGroup>
);

export { ProjectGroup };
