import type { Project } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { ProjectTreeRow } from "./project-tree-row.js";
import { toProjectAgo } from "./workspace-model.js";

interface SidebarProjectsProps {
  readonly isPinned: boolean;
  readonly label: string;
  readonly now: number;
  readonly onOpen: (projectId: string) => void;
  readonly projects: readonly Project[];
}

const toMeta = (
  project: Project,
  isPinned: boolean,
  now: number
): string | null => {
  if (isPinned) {
    return null;
  }

  return toProjectAgo(project, now);
};

const SidebarProjects = ({
  isPinned,
  label,
  now,
  onOpen,
  projects,
}: SidebarProjectsProps): ReactElement | null => {
  if (projects.length === 0) {
    return null;
  }

  return (
    <div className="ide-section">
      <div className="ide-group-label">{label}</div>
      {projects.map((project) => (
        <ProjectTreeRow
          key={project.id}
          depth={0}
          isPinned={isPinned}
          meta={toMeta(project, isPinned, now)}
          onOpen={onOpen}
          project={project}
        />
      ))}
    </div>
  );
};

export { SidebarProjects };
