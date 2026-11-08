import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { useModalDialog } from "./deps.js";
import { ScreenDuplicateForm } from "./screen-duplicate-form.js";

import styles from "./screen.module.css";

interface ScreenDuplicateDialogProps {
  readonly directionId: string | null;
  readonly from: string;
  readonly onClose: () => void;
  readonly projectId: string;
}

const ScreenDuplicateDialog = ({
  directionId,
  from,
  onClose,
  projectId,
}: ScreenDuplicateDialogProps): ReactElement => {
  const dismissDialog = useCallback((): boolean => {
    onClose();

    return true;
  }, [onClose]);

  const { ref } = useModalDialog(dismissDialog);

  return (
    <dialog
      aria-label={copy.copyTitle}
      className={`modal ${styles.dialog}`}
      ref={ref}
    >
      <ScreenDuplicateForm
        directionId={directionId}
        from={from}
        onClose={onClose}
        projectId={projectId}
      />
    </dialog>
  );
};

export { ScreenDuplicateDialog };

export type { ScreenDuplicateDialogProps };
