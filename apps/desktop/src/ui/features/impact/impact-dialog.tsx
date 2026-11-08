import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { useModalDialog } from "./deps.js";
import { ImpactBody } from "./impact-body.js";

import styles from "./impact.module.css";

interface ImpactDialogProps {
  readonly directionId: string | null;
  readonly file: string | null;
  readonly onClose: () => void;
  readonly projectId: string;
}

const ImpactDialog = ({
  directionId,
  file,
  onClose,
  projectId,
}: ImpactDialogProps): ReactElement => {
  const dismissDialog = useCallback((): boolean => {
    onClose();

    return true;
  }, [onClose]);

  const { ref } = useModalDialog(dismissDialog);

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
      <ImpactBody directionId={directionId} file={file} projectId={projectId} />
    </dialog>
  );
};

export { ImpactDialog };

export type { ImpactDialogProps };
