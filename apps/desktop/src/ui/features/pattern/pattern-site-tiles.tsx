import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { PatternCandidate } from "./pattern-model.js";
import { PatternSiteTile } from "./pattern-site-tile.js";

import styles from "./pattern.module.css";

interface PatternSiteTilesProps {
  readonly candidates: readonly PatternCandidate[];
  readonly onSelect: (candidate: PatternCandidate) => void;
  readonly selector: string | null;
}

const PatternSiteTiles = ({
  candidates,
  onSelect,
  selector,
}: PatternSiteTilesProps): ReactElement => (
  <ul aria-label={copy.sectionsLabel} className={styles.tiles}>
    {candidates.map((candidate) => (
      <PatternSiteTile
        candidate={candidate}
        isSelected={candidate.selector === selector}
        key={candidate.selector}
        onSelect={onSelect}
      />
    ))}
  </ul>
);

export { PatternSiteTiles };
