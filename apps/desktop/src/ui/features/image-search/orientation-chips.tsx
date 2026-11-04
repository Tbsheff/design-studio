import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { IMAGE_ORIENTATIONS } from "./deps.js";
import type { ImageOrientation } from "./deps.js";
import { OrientationChip } from "./orientation-chip.js";

import styles from "./image-search.module.css";

interface OrientationChipsProps {
  readonly onPick: (next: ImageOrientation) => void;
  readonly value: ImageOrientation;
}

const OrientationChips = ({
  onPick,
  value,
}: OrientationChipsProps): ReactElement => (
  <fieldset aria-label={copy.orientation} className={styles.chips}>
    {IMAGE_ORIENTATIONS.map((option) => (
      <OrientationChip
        isOn={option === value}
        key={option}
        value={option}
        onPick={onPick}
      />
    ))}
  </fieldset>
);

export { OrientationChips };
