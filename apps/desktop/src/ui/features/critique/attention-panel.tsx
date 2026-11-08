import type { ReactElement } from "react";

import { AttentionHead } from "./attention-head.js";
import { toAttentionKey } from "./attention-model.js";
import { AttentionResult } from "./attention-result.js";
import { copy } from "./copy.js";
import { useAttention } from "./use-attention.js";

import styles from "./critique.module.css";

interface AttentionPanelProps {
  readonly directionId: string | null;
  readonly frameId: string;
  readonly isLive: boolean;
  readonly onSelect: (selector: string) => void;
  readonly projectId: string;
}

const AttentionPanel = (props: AttentionPanelProps): ReactElement => {
  const { attention, error, handleRun, isBusy } = useAttention({
    directionId: props.directionId,
    frameId: props.frameId,
    projectId: props.projectId,
  });

  return (
    <>
      <AttentionHead
        hasResult={attention !== null}
        isBusy={isBusy}
        isDisabled={!props.isLive || props.directionId === null}
        onRun={handleRun}
      />
      {error !== null && <div className="alert error">{error}</div>}
      {attention === null && !isBusy && (
        <p className={styles.empty}>{copy.attention.empty}</p>
      )}
      {attention !== null && (
        <AttentionResult
          key={toAttentionKey(attention)}
          onSelect={props.onSelect}
          projectId={props.projectId}
          view={attention}
        />
      )}
    </>
  );
};

export { AttentionPanel };
