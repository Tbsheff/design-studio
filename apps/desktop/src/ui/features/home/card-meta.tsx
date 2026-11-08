import type { PackSummary, Project } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { formatRelative, formatTime } from "../../domain/format.js";
import { CardPack } from "./card-pack.js";
import { copy } from "./copy.js";
import type { AppHealth } from "./deps.js";
import { HealthCell } from "./health-cell.js";
import type { PackSwatches } from "./project-card-model.js";
import { toProjectBadge } from "./project-card-model.js";

interface CardMetaProps {
  readonly project: Project;
  readonly pack: PackSummary | null;
  readonly toSwatches: PackSwatches;
  readonly health: AppHealth | null;
  readonly hasRunFailed: boolean;
}

const CardMeta = ({
  project,
  pack,
  toSwatches,
  health,
  hasRunFailed,
}: CardMetaProps): ReactElement => {
  const badge = toProjectBadge(project);
  const count = project.directions.length;
  let shownHealth: AppHealth | null = null;

  if (project.imported) {
    shownHealth = health;
  }

  return (
    <span className="project-meta">
      <span className={`home-badge ${badge.tone}`}>{badge.label}</span>
      <HealthCell health={shownHealth} hasRunFailed={hasRunFailed} />
      <time
        className="project-time"
        dateTime={new Date(project.updatedAt).toISOString()}
        data-tip={formatTime(project.updatedAt)}
      >
        {formatRelative(project.updatedAt)}
      </time>
      {count > 1 && (
        <span className="truncate">{`${count} ${copy.directions}`}</span>
      )}
      {pack && <CardPack pack={pack} toSwatches={toSwatches} />}
    </span>
  );
};

export { CardMeta };
