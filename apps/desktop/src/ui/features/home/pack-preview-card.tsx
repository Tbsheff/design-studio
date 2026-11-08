import type { PackSummary } from "@design-studio/contracts";
import { useCallback } from "react";
import type { CSSProperties, ReactElement } from "react";

import { copy } from "./copy.js";
import { RAMP_CELLS, toFontNames } from "./pack-face-model.js";

interface PackPreviewCardProps {
  readonly pack: PackSummary;
  readonly isSelected: boolean;
  readonly faceStyle: CSSProperties;
  readonly onPick: (pack: PackSummary) => void;
}

const toRamp = (): ReactElement => (
  <span className="pc-ramp">
    {RAMP_CELLS.map((cell) => (
      <span key={cell.id} style={cell.style} />
    ))}
  </span>
);

const toSample = (): ReactElement => (
  <span className="pc-sample">
    <span className="pc-sample-card">
      <span className="pc-sample-text">{copy.theQuickBrownFoxJumps}</span>
      <span className="pc-btn">{copy.continue2}</span>
    </span>
    <span className="pc-image" />
  </span>
);

const PackPreviewCard = ({
  pack,
  isSelected,
  faceStyle,
  onPick,
}: PackPreviewCardProps): ReactElement => {
  const pick = useCallback((): void => {
    onPick(pack);
  }, [onPick, pack]);

  return (
    <button
      type="button"
      className="home-pack-card"
      aria-pressed={isSelected}
      data-pack-id={pack.id}
      onClick={pick}
    >
      <span className="home-pack-face" style={faceStyle} aria-hidden="true">
        <span className="pc-fonts">{toFontNames(pack)}</span>
        <span className="pc-name">{pack.name}</span>
        {toRamp()}
        {toSample()}
      </span>
      <span className="home-pack-label truncate">{pack.name}</span>
    </button>
  );
};

export { PackPreviewCard };
