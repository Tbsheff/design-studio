import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { SweepGroup } from "./sweep-group.js";
import { useSweep } from "./use-sweep.js";
import type { SweepSetup } from "./use-sweep.js";

import styles from "./token-sweep.module.css";

const SweepPanel = (setup: SweepSetup): ReactElement => {
  const sweep = useSweep(setup);
  const { report } = sweep;
  const leftovers = report?.unmatched.length ?? 0;
  const isEmpty = report !== null && report.changes.length === 0;
  let scanLabel: string = copy.scan;

  if (sweep.isBusy) {
    scanLabel = copy.scanning;
  }

  return (
    <section aria-label={copy.title} className={styles.panel}>
      <div className={styles.actions}>
        <button
          className={styles.secondary}
          disabled={sweep.isBusy}
          onClick={sweep.handleScan}
          type="button"
        >
          {scanLabel}
        </button>
        <button
          className={styles.primary}
          disabled={sweep.isBusy || sweep.selected.size === 0}
          onClick={sweep.handleApply}
          type="button"
        >
          {`${copy.apply} (${sweep.selected.size})`}
        </button>
        {sweep.applied !== null && (
          <button
            className={styles.secondary}
            disabled={sweep.isBusy}
            onClick={sweep.handleUndo}
            type="button"
          >
            {copy.undo}
          </button>
        )}
      </div>
      <span className={styles.error} role="alert">
        {sweep.error}
      </span>
      {sweep.applied !== null && (
        <span className={styles.note}>{copy.applied}</span>
      )}
      {isEmpty && sweep.applied === null && (
        <span className={styles.note}>{copy.empty}</span>
      )}
      {sweep.groups.map((group) => (
        <SweepGroup
          group={group}
          key={group.kind}
          onToggle={sweep.handleToggle}
          selected={sweep.selected}
        />
      ))}
      {leftovers > 0 && (
        <span className={styles.note}>{`${copy.leftovers}: ${leftovers}`}</span>
      )}
    </section>
  );
};

export { SweepPanel };
