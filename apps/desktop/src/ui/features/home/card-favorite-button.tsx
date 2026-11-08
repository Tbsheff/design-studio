import type { Project } from "@design-studio/contracts";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { homePrefs } from "./home-prefs-model.js";
import {
  toFavoriteLabel,
  toFavoriteTip,
  toTabIndex,
} from "./project-card-model.js";
import { Star } from "./star-icon.js";

interface CardFavoriteButtonProps {
  readonly project: Project;
  readonly isActive: boolean;
  readonly isFavorite: boolean;
}

const CardFavoriteButton = ({
  project,
  isActive,
  isFavorite,
}: CardFavoriteButtonProps): ReactElement => {
  const toggle = useCallback((): void => {
    homePrefs.toggleFavorite(project.id);
  }, [project.id]);

  return (
    <button
      type="button"
      className="project-star icon-btn small"
      tabIndex={toTabIndex(isActive)}
      aria-label={toFavoriteLabel(project.name, isFavorite)}
      aria-pressed={isFavorite}
      data-tip={toFavoriteTip(isFavorite)}
      data-tip-align="end"
      onClick={toggle}
    >
      <Star isFilled={isFavorite} />
    </button>
  );
};

export { CardFavoriteButton };
