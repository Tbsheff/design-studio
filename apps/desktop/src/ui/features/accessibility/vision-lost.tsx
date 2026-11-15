import type { ReactElement } from "react";

import { ContrastRow } from "./contrast-row.js";
import { copy } from "./copy.js";
import type { ContrastFix } from "./deps.js";
import { toContrastPair } from "./vision-model.js";
import type { VisionReport } from "./vision-model.js";

import styles from "./accessibility.module.css";

interface VisionLostProps {
  readonly cell: VisionReport["cells"][number];
  readonly onFix: (fix: ContrastFix) => void;
}

const VisionLost = ({ cell, onFix }: VisionLostProps): ReactElement | null => {
  if (cell.lostPairs.length === 0) {
    return null;
  }

  return (
    <div className={styles.body}>
      <p className={styles.note}>
        {copy.visionLost(copy.visionKind[cell.kind])}
      </p>
      {cell.lostPairs.map((lost) => (
        <ContrastRow
          disabled
          isDark={false}
          key={`${lost.layerId}|${lost.text}`}
          pair={toContrastPair(lost)}
          onFix={onFix}
        />
      ))}
    </div>
  );
};

export { VisionLost };

export type { VisionLostProps };
