import { useCallback, useMemo } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { useModalDialog } from "./deps.js";
import { DevStatusBody } from "./dev-status-body.js";
import { toGroups, toRows } from "./dev-status-model.js";
import type { FrameRef, StatusValue } from "./dev-status-model.js";
import { ErrorLine } from "./error-line.js";
import { useListDevStatus } from "./use-list.js";
import { useMarkOnOpen } from "./use-mark-on-open.js";
import { useSetDevStatus } from "./use-set.js";

import styles from "./dev-status.module.css";

interface DevStatusDialogProps {
  readonly frames: readonly FrameRef[];
  readonly markFrameId: string | null;
  readonly onClose: () => void;
  readonly projectId: string;
}

const NO_ENTRIES: never[] = [];

const note = null;

const DevStatusDialog = ({
  frames,
  markFrameId,
  onClose,
  projectId,
}: DevStatusDialogProps): ReactElement => {
  const list = useListDevStatus(projectId);
  const { run } = useSetDevStatus();

  const dismissDialog = useCallback((): boolean => {
    onClose();

    return true;
  }, [onClose]);

  const { ref } = useModalDialog(dismissDialog);

  useMarkOnOpen(projectId, markFrameId);

  const setFrameStatus = useCallback(
    (frameId: string, status: StatusValue): void => {
      run({ frameId, note, projectId, status });
    },
    [projectId, run]
  );

  const groups = useMemo(
    () => toGroups(toRows(frames, list.data?.items ?? NO_ENTRIES)),
    [frames, list.data]
  );

  return (
    <dialog
      aria-label={copy.title}
      className={`modal ${styles.dialog}`}
      ref={ref}
    >
      <header className={styles.head}>
        <h2 className={styles.title}>{copy.title}</h2>
        <button className={styles.close} onClick={onClose} type="button">
          {copy.close}
        </button>
      </header>
      <ErrorLine error={list.error} />
      <DevStatusBody
        groups={groups}
        onStatus={setFrameStatus}
        projectId={projectId}
      />
    </dialog>
  );
};

export { DevStatusDialog };

export type { DevStatusDialogProps };
