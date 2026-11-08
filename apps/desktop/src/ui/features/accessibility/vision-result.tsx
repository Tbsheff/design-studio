import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { ContrastFix } from "./deps.js";
import type { VisionResult as VisionResultData } from "./vision-api.js";
import { VisionLost } from "./vision-lost.js";
import { hasFindings } from "./vision-model.js";

import styles from "./accessibility.module.css";

interface VisionResultProps {
  readonly onFix: (fix: ContrastFix) => void;
  readonly result: VisionResultData;
}

const VisionResult = ({ onFix, result }: VisionResultProps): ReactElement => {
  const { report } = result;

  return (
    <div className={styles.body}>
      <img
        alt={copy.visionSheet}
        className={styles.sheet}
        src={result.sheetUrl}
      />
      {!hasFindings(report) && (
        <p className={styles.note}>{copy.visionNothing}</p>
      )}
      {report.confusedPairs.map((pair) => (
        <p
          className={styles.note}
          key={`${pair.kind}|${pair.first.color}|${pair.second.color}`}
        >
          {copy.visionConfused(
            copy.visionKind[pair.kind],
            pair.first.label,
            pair.second.label,
            pair.after
          )}
        </p>
      ))}
      {report.cells.map((cell) => (
        <VisionLost cell={cell} key={cell.kind} onFix={onFix} />
      ))}
    </div>
  );
};

export { VisionResult };

export type { VisionResultProps };
