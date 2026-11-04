import { useCallback, useState } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { ExportButtons } from "./export-buttons.js";
import type { ExportFormat } from "./use-animation-actions.js";

import styles from "./animation.module.css";

interface AnimationActionsProps {
  readonly isBusy: boolean;
  readonly isDirty: boolean;
  readonly isPlaying: boolean;
  readonly onDelete: () => void;
  readonly onExport: (format: ExportFormat) => void;
  readonly onSave: () => void;
  readonly onToggle: () => void;
  readonly timeMs: number;
}

const AnimationActions = ({
  isBusy,
  isDirty,
  isPlaying,
  onDelete,
  onExport,
  onSave,
  onToggle,
  timeMs,
}: AnimationActionsProps): ReactElement => {
  const [isSure, setIsSure] = useState(false);

  const handleDelete = useCallback((): void => {
    if (isSure) {
      setIsSure(false);
      onDelete();

      return;
    }

    setIsSure(true);
  }, [isSure, onDelete]);

  let playLabel: string = copy.play;
  let deleteLabel: string = copy.delete;
  let statusLabel: string = copy.saved;

  if (isPlaying) {
    playLabel = copy.pause;
  }

  if (isSure) {
    deleteLabel = copy.deleteSure;
  }

  if (isDirty) {
    statusLabel = copy.unsaved;
  }

  return (
    <div className={styles.actions}>
      <button className={styles.primary} onClick={onToggle} type="button">
        {playLabel}
      </button>
      <output className={styles.time}>{`${Math.round(timeMs)} ms`}</output>
      <button
        className={styles.primary}
        disabled={!isDirty || isBusy}
        onClick={onSave}
        type="button"
      >
        {copy.save}
      </button>
      <span className={styles.status}>{statusLabel}</span>
      <ExportButtons isBusy={isBusy} onExport={onExport} />
      <button
        className={styles.danger}
        disabled={isBusy}
        onClick={handleDelete}
        type="button"
      >
        {deleteLabel}
      </button>
    </div>
  );
};

export { AnimationActions };
