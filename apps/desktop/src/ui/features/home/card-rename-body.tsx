import type { PackSummary, Project } from "@design-studio/contracts";
import { Suspense, useMemo } from "react";
import type { ReactElement } from "react";

import { RenameField } from "./card-menus-model.js";
import { CardMeta } from "./card-meta.js";
import type { AppHealth } from "./deps.js";
import type { PackSwatches } from "./project-card-model.js";

interface CardRenameBodyProps {
  readonly project: Project;
  readonly pack: PackSummary | null;
  readonly toSwatches: PackSwatches;
  readonly health: AppHealth | null;
  readonly hasRunFailed: boolean;
  readonly onDone: (name: string | null) => void;
}

const CardRenameBody = ({
  project,
  pack,
  toSwatches,
  health,
  hasRunFailed,
  onDone,
}: CardRenameBodyProps): ReactElement => {
  const fallback = useMemo(
    () => <span className="project-name">{project.name}</span>,
    [project.name]
  );

  return (
    <span className="project-body">
      <Suspense fallback={fallback}>
        <RenameField project={project} onDone={onDone} />
      </Suspense>
      <CardMeta
        project={project}
        pack={pack}
        toSwatches={toSwatches}
        health={health}
        hasRunFailed={hasRunFailed}
      />
    </span>
  );
};

export { CardRenameBody };
