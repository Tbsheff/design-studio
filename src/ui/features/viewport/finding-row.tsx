import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { jumpToCell } from "./jump.js";
import { cellText, KIND_TEXT } from "./matrix-model.js";
import type { MatrixFindingView } from "./matrix-model.js";

import styles from "./viewport.module.css";

interface FindingRowProps {
  readonly finding: MatrixFindingView;
}

const FindingRow = ({ finding }: FindingRowProps): ReactElement => {
  const { frameId } = finding;

  const handleJump = useCallback(() => {
    if (frameId !== null) {
      jumpToCell(frameId);
    }
  }, [frameId]);

  return (
    <li className={styles.row}>
      <button
        className={styles.jump}
        data-tip={copy.jump}
        disabled={frameId === null}
        onClick={handleJump}
        type="button"
      >
        <span className={styles.cell}>{cellText(finding)}</span>
        <span className={styles.kind}>{KIND_TEXT[finding.kind]}</span>
        <span className={styles.detail}>{finding.detail}</span>
      </button>
    </li>
  );
};

export { FindingRow };
