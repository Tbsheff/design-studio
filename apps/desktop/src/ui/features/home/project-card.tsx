import type { PackSummary, Project } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { CardControls } from "./card-controls.js";
import { CardMain } from "./card-main.js";
import type { AppHealth } from "./deps.js";
import type { CardActions, PackSwatches } from "./project-card-model.js";
import { useProjectCard } from "./use-project-card.js";

interface ProjectCardProps {
  readonly project: Project;
  readonly pack: PackSummary | null;
  readonly toSwatches: PackSwatches;
  readonly health: AppHealth | null;
  readonly homeDir: string | null;
  readonly isActive: boolean;
  readonly isFavorite: boolean;
  readonly actions: CardActions;
  readonly onFocusCard: (projectId: string) => void;
  readonly onRegisterOpen: (
    id: string,
    button: HTMLButtonElement | null
  ) => void;
}

const ProjectCard = ({
  project,
  pack,
  toSwatches,
  health,
  homeDir,
  isActive,
  isFavorite,
  actions,
  onFocusCard,
  onRegisterOpen,
}: ProjectCardProps): ReactElement => {
  const card = useProjectCard({
    actions,
    isFavorite,
    onFocusCard,
    onRegisterOpen,
    project,
  });

  const {
    cardRef,
    className,
    closeMenu,
    menu,
    onContextMenu,
    pick,
    toggleMenu,
  } = card;

  return (
    <div
      ref={cardRef}
      className={className}
      data-project-id={project.id}
      onContextMenu={onContextMenu}
    >
      <CardMain
        project={project}
        pack={pack}
        toSwatches={toSwatches}
        health={health}
        homeDir={homeDir}
        isActive={isActive}
        actions={actions}
        card={card}
      />
      <CardControls
        project={project}
        homeDir={homeDir}
        isActive={isActive}
        isFavorite={isFavorite}
        menu={menu}
        onToggle={toggleMenu}
        onClose={closeMenu}
        onPick={pick}
      />
    </div>
  );
};

export { ProjectCard };
