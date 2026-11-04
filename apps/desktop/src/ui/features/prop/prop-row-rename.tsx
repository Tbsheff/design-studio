import { useCallback, useState } from "react";
import type { ChangeEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import { isPropName } from "./prop-model.js";

import styles from "./prop.module.css";

interface PropRowRenameProps {
  readonly isBusy: boolean;
  readonly name: string;
  readonly onCancel: () => void;
  readonly onRename: (name: string, newName: string) => void;
}

const PropRowRename = ({
  isBusy,
  name,
  onCancel,
  onRename,
}: PropRowRenameProps): ReactElement => {
  const [draft, setDraft] = useState(name);

  const handleDraft = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void =>
      setDraft(event.target.value),
    []
  );

  const handleSave = useCallback((): void => {
    onRename(name, draft);
    onCancel();
  }, [draft, name, onCancel, onRename]);

  const isValid = isPropName(draft) && draft !== name;

  return (
    <div className={styles.rowActions}>
      <input
        aria-invalid={!isValid}
        aria-label={copy.renameLabel}
        className={styles.input}
        name="newName"
        onChange={handleDraft}
        value={draft}
      />
      <button
        className={styles.primary}
        disabled={isBusy || !isValid}
        onClick={handleSave}
        type="button"
      >
        {copy.save}
      </button>
      <button className={styles.small} onClick={onCancel} type="button">
        {copy.cancel}
      </button>
    </div>
  );
};

export { PropRowRename };
