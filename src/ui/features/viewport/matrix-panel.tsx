import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { FindingsList } from "./findings-list.js";
import { SchemeChips } from "./scheme-chips.js";
import type { MatrixView } from "./use-matrix.js";
import { WidthChips } from "./width-chips.js";

import styles from "./viewport.module.css";

interface MatrixPanelProps {
  readonly matrix: MatrixView;
}

const MatrixPanel = ({ matrix }: MatrixPanelProps): ReactElement => (
  <section
    aria-label={copy.menuLabel}
    className={`ui-menu topbar-menu align-end ${styles.panel}`}
  >
    <span className={styles.label}>{copy.widthLabel}</span>
    <WidthChips onPick={matrix.handleWidth} widths={matrix.widths} />
    <span className={styles.label}>{copy.schemeLabel}</span>
    <SchemeChips onPick={matrix.handleScheme} scheme={matrix.scheme} />
    <div className={styles.actions}>
      <button
        className={styles.primary}
        disabled={!matrix.canRun || matrix.isBusy}
        onClick={matrix.handleCreate}
        type="button"
      >
        {copy.create}
      </button>
      <button
        className={styles.secondary}
        disabled={!matrix.canRun || matrix.isBusy}
        onClick={matrix.handleCheck}
        type="button"
      >
        {copy.check}
      </button>
    </div>
    <span className={styles.error} role="alert">
      {matrix.error}
    </span>
    {matrix.report && (
      <>
        <span className={styles.label}>{copy.findings}</span>
        <FindingsList report={matrix.report} />
        <span className={styles.path}>{matrix.report.contactSheet}</span>
      </>
    )}
  </section>
);

export { MatrixPanel };
