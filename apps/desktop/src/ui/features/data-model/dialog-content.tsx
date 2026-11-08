import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { DialogBody } from "./dialog-body.js";

import styles from "./data-model.module.css";

interface DialogContentProps {
  readonly onInsert: (text: string) => void;
  readonly projectId: string | null;
}

const DialogContent = ({
  onInsert,
  projectId,
}: DialogContentProps): ReactElement => {
  if (projectId === null) {
    return <p className={styles.note}>{copy.noApp}</p>;
  }

  return <DialogBody onInsert={onInsert} projectId={projectId} />;
};

export { DialogContent };
