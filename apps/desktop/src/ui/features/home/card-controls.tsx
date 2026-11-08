import type { Project } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { CardFavoriteButton } from "./card-favorite-button.js";
import { CardMenuHost } from "./card-menu-host.js";
import { CardMoreButton } from "./card-more-button.js";
import type { CardAction, MenuAt } from "./project-card-model.js";

interface CardControlsProps {
  readonly project: Project;
  readonly homeDir: string | null;
  readonly isActive: boolean;
  readonly isFavorite: boolean;
  readonly menu: MenuAt;
  readonly onToggle: () => void;
  readonly onClose: (shouldRefocus: boolean) => void;
  readonly onPick: (action: CardAction) => void;
}

const CardControls = ({
  project,
  homeDir,
  isActive,
  isFavorite,
  menu,
  onToggle,
  onClose,
  onPick,
}: CardControlsProps): ReactElement => (
  <>
    <CardFavoriteButton
      project={project}
      isActive={isActive}
      isFavorite={isFavorite}
    />
    <CardMoreButton
      project={project}
      isActive={isActive}
      isMenuOpen={menu !== null}
      onToggle={onToggle}
    />
    {menu && (
      <CardMenuHost
        project={project}
        homeDir={homeDir}
        at={menu}
        onClose={onClose}
        onPick={onPick}
      />
    )}
  </>
);

export { CardControls };
