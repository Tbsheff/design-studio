import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { PlanGroup } from "./screen-model.js";

import styles from "./screen.module.css";

interface ScreenGroupDetailProps {
  readonly group: PlanGroup;
}

const ScreenGroupDetail = ({ group }: ScreenGroupDetailProps): ReactElement => {
  const shell = group.shellComponents.join(", ");
  const samples = group.sampleRoutes.join(", ");

  return (
    <dl className={styles.detail}>
      <div className={styles.detailRow}>
        <dt className={styles.detailKey}>{copy.groupShell}</dt>
        <dd className={`mono ${styles.detailValue}`}>
          {shell || copy.groupNoShell}
        </dd>
      </div>
      <div className={styles.detailRow}>
        <dt className={styles.detailKey}>{copy.groupSamples}</dt>
        <dd className={`mono ${styles.detailValue}`}>{samples}</dd>
      </div>
      {group.isAuthRequired && (
        <div className={styles.detailRow}>
          <dt className={styles.detailKey}>{copy.groupAccess}</dt>
          <dd className={styles.detailValue}>{copy.groupAuth}</dd>
        </div>
      )}
    </dl>
  );
};

export { ScreenGroupDetail };
