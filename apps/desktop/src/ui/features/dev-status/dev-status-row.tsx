import { useCallback } from "react";
import type { ReactElement } from "react";

import { CopyHandoff } from "./copy-handoff.js";
import { copy } from "./copy.js";
import { UiSelect } from "./deps.js";
import { ChangedChip } from "./dev-status-chips.js";
import { toFrameName } from "./dev-status-model.js";
import type { StatusRow, StatusValue } from "./dev-status-model.js";
import { STATUS_OPTIONS } from "./status-options.js";

import styles from "./dev-status.module.css";

interface DevStatusRowProps {
  readonly onStatus: (frameId: string, status: StatusValue) => void;
  readonly projectId: string;
  readonly row: StatusRow;
}

const DevStatusRow = ({
  onStatus,
  projectId,
  row,
}: DevStatusRowProps): ReactElement => {
  const { entry, frame } = row;

  const setRowStatus = useCallback(
    (status: StatusValue): void => onStatus(frame.id, status),
    [frame.id, onStatus]
  );

  return (
    <li className={`ui-menu-row ${styles.row}`}>
      <span className={styles.name}>{toFrameName(frame)}</span>
      <ChangedChip entry={entry} />
      {entry && <CopyHandoff entry={entry} projectId={projectId} row={row} />}
      <UiSelect
        aria-label={copy.statusLabel}
        onChange={setRowStatus}
        options={STATUS_OPTIONS}
        placeholder={copy.statusNone}
        size="sm"
        value={entry?.status ?? ("" as StatusValue)}
      />
    </li>
  );
};

export { DevStatusRow };
