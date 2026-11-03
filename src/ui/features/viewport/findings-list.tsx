import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { FindingRow } from "./finding-row.js";
import type { MatrixReportView } from "./matrix-model.js";

import styles from "./viewport.module.css";

interface FindingsListProps {
  readonly report: MatrixReportView;
}

const FindingsList = ({ report }: FindingsListProps): ReactElement => {
  if (report.findings.length === 0) {
    return <span className={styles.clean}>{copy.clean}</span>;
  }

  return (
    <ul aria-label={copy.findings} className={styles.list}>
      {report.findings.map((finding) => (
        <FindingRow
          finding={finding}
          key={`${finding.frameId ?? "none"}-${finding.kind}-${finding.selector}-${finding.detail}`}
        />
      ))}
    </ul>
  );
};

export { FindingsList };
