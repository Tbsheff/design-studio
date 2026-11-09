import type { Project } from "@design-studio/contracts";
import type { ReactElement } from "react";
import { useCallback } from "react";

import { TreeRow } from "./tree-row.js";

interface ProjectTreeRowProps {
  readonly depth: 0 | 2;
  readonly isPinned: boolean;
  readonly meta: string | null;
  readonly onOpen: (projectId: string) => void;
  readonly project: Project;
}

const ProjectTreeRow = ({
  depth,
  isPinned,
  meta,
  onOpen,
  project,
}: ProjectTreeRowProps): ReactElement => {
  const handleOpen = useCallback((): void => {
    onOpen(project.id);
  }, [onOpen, project.id]);

  return (
    <TreeRow
      depth={depth}
      isPinned={isPinned}
      isSelected={false}
      meta={meta}
      onClick={handleOpen}
    >
      {project.name}
    </TreeRow>
  );
};

export { ProjectTreeRow };
