import type { PackSummary, Project } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { CardPreview } from "./card-preview.js";
import { CardRenameBody } from "./card-rename-body.js";
import type { AppHealth } from "./deps.js";
import type { PackSwatches } from "./project-card-model.js";

interface CardRenamingProps {
  readonly project: Project;
  readonly pack: PackSummary | null;
  readonly toSwatches: PackSwatches;
  readonly health: AppHealth | null;
  readonly hasRunFailed: boolean;
  readonly thumb: string | null;
  readonly onDone: (name: string | null) => void;
}

const CardRenaming = ({
  project,
  pack,
  toSwatches,
  health,
  hasRunFailed,
  thumb,
  onDone,
}: CardRenamingProps): ReactElement => (
  <div className="project-open renaming">
    <CardPreview project={project} thumb={thumb} />
    <CardRenameBody
      project={project}
      pack={pack}
      toSwatches={toSwatches}
      health={health}
      hasRunFailed={hasRunFailed}
      onDone={onDone}
    />
  </div>
);

export { CardRenaming };
