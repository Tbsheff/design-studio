import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { useModalDialog } from "./deps.js";
import { KindChips } from "./kind-chips.js";
import { MeasureSwitch } from "./measure-switch.js";
import { MeasureTable } from "./measure-table.js";
import { useNoteForm } from "./use-note-form.js";

import styles from "./dev-note.module.css";

interface DevNoteDialogProps {
  readonly frameId: string;
  readonly layerId: string | null;
  readonly layerName: string;
  readonly onClose: () => void;
  readonly projectId: string;
  readonly source: string | null;
}

const DevNoteDialog = ({
  frameId,
  layerId,
  layerName,
  onClose,
  projectId,
  source,
}: DevNoteDialogProps): ReactElement => {
  const form = useNoteForm({ frameId, layerId, projectId, source });

  const dismissDialog = useCallback((): boolean => {
    onClose();

    return true;
  }, [onClose]);

  const { ref } = useModalDialog(dismissDialog);

  const isSaved = form.saved !== null;
  const isBlank = form.text.trim() === "";

  return (
    <dialog
      aria-label={copy.addTitle}
      className={`modal ${styles.dialog}`}
      ref={ref}
    >
      <header className={styles.head}>
        <h2 className={styles.title}>{copy.addTitle}</h2>
        <span className={styles.target}>{layerName}</span>
      </header>
      <KindChips kind={form.kind} onPick={form.handleKind} />
      <textarea
        aria-label={copy.textLabel}
        className={styles.text}
        disabled={isSaved}
        maxLength={2000}
        onChange={form.handleText}
        placeholder={copy.textPlaceholder}
        rows={3}
        value={form.text}
      />
      <MeasureSwitch
        isDisabled={layerId === null || isSaved}
        isOn={form.isMeasured}
        onToggle={form.handleToggle}
      />
      {form.saved?.measurements && (
        <MeasureTable measurements={form.saved.measurements} />
      )}
      {form.error && <p className="ui-error">{copy.saveFailed}</p>}
      <footer className={styles.actions}>
        {isSaved && <span className={styles.saved}>{copy.saved}</span>}
        <button className={styles.small} onClick={onClose} type="button">
          {copy.cancel}
        </button>
        {!isSaved && (
          <button
            className={styles.primary}
            disabled={isBlank || form.isPending}
            onClick={form.handleSave}
            type="button"
          >
            {copy.save}
          </button>
        )}
      </footer>
    </dialog>
  );
};

export { DevNoteDialog };

export type { DevNoteDialogProps };
