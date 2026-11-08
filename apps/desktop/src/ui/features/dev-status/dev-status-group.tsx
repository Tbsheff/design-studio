import type { ReactElement } from "react";

import type { StatusGroup, StatusValue } from "./dev-status-model.js";
import { DevStatusRow } from "./dev-status-row.js";

import styles from "./dev-status.module.css";

interface DevStatusGroupProps {
  readonly group: StatusGroup;
  readonly onStatus: (frameId: string, status: StatusValue) => void;
  readonly projectId: string;
}

const DevStatusGroup = ({
  group,
  onStatus,
  projectId,
}: DevStatusGroupProps): ReactElement => (
  <section>
    <h3 className={styles.groupTitle}>{group.title}</h3>
    <ul className="ui-menu">
      {group.rows.map((row) => (
        <DevStatusRow
          key={row.frame.id}
          onStatus={onStatus}
          projectId={projectId}
          row={row}
        />
      ))}
    </ul>
  </section>
);

export { DevStatusGroup };
