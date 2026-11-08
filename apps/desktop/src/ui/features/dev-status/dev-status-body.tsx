import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { DevStatusGroup } from "./dev-status-group.js";
import type { StatusGroup, StatusValue } from "./dev-status-model.js";

import styles from "./dev-status.module.css";

interface DevStatusBodyProps {
  readonly groups: readonly StatusGroup[];
  readonly onStatus: (frameId: string, status: StatusValue) => void;
  readonly projectId: string;
}

const DevStatusBody = ({
  groups,
  onStatus,
  projectId,
}: DevStatusBodyProps): ReactElement => {
  if (groups.length === 0) {
    return <p className="ui-muted">{copy.empty}</p>;
  }

  return (
    <div className={styles.groups}>
      {groups.map((group) => (
        <DevStatusGroup
          group={group}
          key={group.title}
          onStatus={onStatus}
          projectId={projectId}
        />
      ))}
    </div>
  );
};

export { DevStatusBody };
