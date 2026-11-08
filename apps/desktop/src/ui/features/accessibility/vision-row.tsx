import type { ReactElement } from "react";

import type { AccessibilityIds } from "./accessibility-api.js";
import { AccessibilityNote } from "./accessibility-note.js";
import { copy } from "./copy.js";
import type { ContrastFix } from "./deps.js";
import { useVision } from "./use-vision.js";
import { VisionChip } from "./vision-chip.js";
import { VISION_KINDS } from "./vision-model.js";
import { VisionResult } from "./vision-result.js";

import styles from "./accessibility.module.css";

interface VisionRowProps {
  readonly ids: AccessibilityIds;
  readonly onFix: (fix: ContrastFix) => void;
}

const VisionRow = ({ ids, onFix }: VisionRowProps): ReactElement => {
  const vision = useVision(ids);
  let runLabel: string = copy.visionRun;

  if (vision.isPending) {
    runLabel = copy.visionRunning;
  }

  return (
    <div className={styles.body} data-tip={copy.visionTip}>
      <div className={styles.line}>
        <span className={styles.label}>{copy.visionTitle}</span>
        <span className={styles.spacer} />
        <button
          className="btn small"
          disabled={vision.isPending || vision.kinds.length === 0}
          type="button"
          onClick={vision.handleRun}
        >
          {runLabel}
        </button>
      </div>
      <fieldset aria-label={copy.visionChips} className={styles.chips}>
        {VISION_KINDS.map((kind) => (
          <VisionChip
            isOn={vision.kinds.includes(kind)}
            key={kind}
            kind={kind}
            onToggle={vision.handleToggle}
          />
        ))}
      </fieldset>
      {vision.result !== null && (
        <VisionResult result={vision.result} onFix={onFix} />
      )}
      <AccessibilityNote isError text={vision.error} />
    </div>
  );
};

export { VisionRow };

export type { VisionRowProps };
