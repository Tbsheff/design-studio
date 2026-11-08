import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { closeSampleDataDialog, useModalDialog, useUi } from "./deps.js";
import { DialogContent } from "./dialog-content.js";

import styles from "./data-model.module.css";

interface DataModelDialogProps {
  readonly onInsert: (text: string) => void;
}

const DataModelDialog = ({ onInsert }: DataModelDialogProps): ReactElement => {
  const { ref } = useModalDialog(closeSampleDataDialog);
  const { activeProjectId } = useUi();

  return (
    <dialog ref={ref} className={styles.sheet} aria-label={copy.dialog}>
      <h2 className={styles.title}>{copy.title}</h2>
      <DialogContent onInsert={onInsert} projectId={activeProjectId} />
    </dialog>
  );
};

export { DataModelDialog };

export type { DataModelDialogProps };
