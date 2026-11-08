import type { Project } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { MouseEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import { toTabIndex } from "./project-card-model.js";

const MORE_ICON_SIZE = 16;

interface CardMoreButtonProps {
  readonly project: Project;
  readonly isActive: boolean;
  readonly isMenuOpen: boolean;
  readonly onToggle: () => void;
}

const CardMoreButton = ({
  project,
  isActive,
  isMenuOpen,
  onToggle,
}: CardMoreButtonProps): ReactElement => {
  const stopPress = useCallback(
    (event: MouseEvent<HTMLButtonElement>): void => {
      event.stopPropagation();
    },
    []
  );

  return (
    <button
      type="button"
      className="project-more icon-btn"
      tabIndex={toTabIndex(isActive)}
      aria-label={`${copy.moreActionsFor} ${project.name}`}
      aria-haspopup="menu"
      aria-expanded={isMenuOpen}
      data-tip={copy.moreActions}
      data-tip-align="end"
      onClick={onToggle}
      onMouseDown={stopPress}
    >
      <Icon name="more" size={MORE_ICON_SIZE} />
    </button>
  );
};

export { CardMoreButton };
