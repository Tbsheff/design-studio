import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { CritiqueHead } from "./critique-head.js";
import { CritiqueResult } from "./critique-result.js";
import { useCritique } from "./use-critique.js";

import styles from "./critique.module.css";

interface PanelProps {
  readonly directionId: string | null;
  readonly frameId: string;
  readonly isLive: boolean;
  readonly onSelect: (selector: string) => void;
  readonly projectId: string;
}

const CritiquePanel = (props: PanelProps): ReactElement => {
  const { critique, error, handleRun, isBusy } = useCritique({
    directionId: props.directionId,
    frameId: props.frameId,
    projectId: props.projectId,
  });

  return (
    <section aria-label={copy.title} className="review-group">
      <CritiqueHead
        count={critique?.issues.length ?? null}
        isBusy={isBusy}
        isDisabled={!props.isLive || props.directionId === null}
        onRun={handleRun}
      />
      {error !== null && <div className="alert error">{error}</div>}
      {critique === null && !isBusy && (
        <p className={styles.empty}>{copy.empty}</p>
      )}
      {critique !== null && (
        <CritiqueResult critique={critique} onSelect={props.onSelect} />
      )}
    </section>
  );
};

export { CritiquePanel };

export type { PanelProps };
