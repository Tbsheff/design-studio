import type { PackSummary, Project } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { CardMeta } from "./card-meta.js";
import type { AppHealth } from "./deps.js";
import type { PackSwatches } from "./project-card-model.js";
import { toProjectPlace } from "./project-card-model.js";

interface CardBodyProps {
  readonly project: Project;
  readonly pack: PackSummary | null;
  readonly toSwatches: PackSwatches;
  readonly health: AppHealth | null;
  readonly homeDir: string | null;
  readonly hasRunFailed: boolean;
}

const CardBody = ({
  project,
  pack,
  toSwatches,
  health,
  homeDir,
  hasRunFailed,
}: CardBodyProps): ReactElement => (
  <span className="project-body">
    <span className="project-name" data-tip={project.name}>
      {project.name}
    </span>
    <span className="project-place mono truncate">
      {toProjectPlace(project, homeDir)}
    </span>
    <CardMeta
      project={project}
      pack={pack}
      toSwatches={toSwatches}
      health={health}
      hasRunFailed={hasRunFailed}
    />
  </span>
);

export { CardBody };
