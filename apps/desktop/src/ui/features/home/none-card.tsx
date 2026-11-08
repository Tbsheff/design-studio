import type { ReactElement } from "react";

import { copy } from "./copy.js";

interface NoneCardProps {
  readonly isSelected: boolean;
  readonly onPick: () => void;
}

const NoneCard = ({ isSelected, onPick }: NoneCardProps): ReactElement => (
  <button
    type="button"
    className="home-pack-card none"
    aria-pressed={isSelected}
    onClick={onPick}
  >
    <span className="home-pack-face none" aria-hidden="true">
      <span className="pc-none-text">{copy.noDesignSystem}</span>
      <span className="pc-none-hint">{copy.theAgentPicksTheLook}</span>
    </span>
    <span className="home-pack-label">{copy.none}</span>
  </button>
);

export { NoneCard };
