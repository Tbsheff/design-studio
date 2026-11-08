import type { PackSummary, Project } from "@design-studio/contracts";
import type { KeyboardEvent, ReactElement, RefObject } from "react";

import type { AppHealth } from "./deps.js";
import { toClassName } from "./project-card-model.js";
import type { CardActions, PackSwatches } from "./project-card-model.js";
import { ProjectCard } from "./project-card.js";

interface ProjectGridCardsProps {
  readonly shown: readonly Project[];
  readonly view: string;
  readonly gridRef: RefObject<HTMLDivElement | null>;
  readonly onGridKey: (event: KeyboardEvent<HTMLDivElement>) => void;
  readonly toPack: (packId: string | null) => PackSummary | null;
  readonly toSwatches: PackSwatches;
  readonly health: ReadonlyMap<string, AppHealth>;
  readonly homeDir: string | null;
  readonly active: string | null;
  readonly favoriteIds: ReadonlySet<string>;
  readonly actions: CardActions;
  readonly onFocusCard: (id: string) => void;
  readonly onRegisterOpen: (
    id: string,
    button: HTMLButtonElement | null
  ) => void;
}

const ProjectGridCards = ({
  shown,
  view,
  gridRef,
  onGridKey,
  toPack,
  toSwatches,
  health,
  homeDir,
  active,
  favoriteIds,
  actions,
  onFocusCard,
  onRegisterOpen,
}: ProjectGridCardsProps): ReactElement => (
  <div
    className={toClassName("project-grid", view)}
    ref={gridRef}
    role="presentation"
    onKeyDown={onGridKey}
  >
    {shown.map((project) => (
      <ProjectCard
        key={project.id}
        project={project}
        pack={toPack(project.packId ?? null)}
        health={health.get(project.id) ?? null}
        homeDir={homeDir}
        isActive={project.id === active}
        isFavorite={favoriteIds.has(project.id)}
        actions={actions}
        onFocusCard={onFocusCard}
        onRegisterOpen={onRegisterOpen}
        toSwatches={toSwatches}
      />
    ))}
  </div>
);

export { ProjectGridCards };
