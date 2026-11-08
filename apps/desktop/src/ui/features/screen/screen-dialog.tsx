import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { useModalDialog } from "./deps.js";
import { ScreenCreateForm } from "./screen-create-form.js";

import styles from "./screen.module.css";

interface ScreenDialogProps {
  readonly directionId: string | null;
  readonly initialPath: string;
  readonly onClose: () => void;
  readonly projectId: string;
}

const ScreenDialog = ({
  directionId,
  initialPath,
  onClose,
  projectId,
}: ScreenDialogProps): ReactElement => {
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
      <ScreenCreateForm
        directionId={directionId}
        initialPath={initialPath}
        onClose={onClose}
        projectId={projectId}
      />
    </dialog>
  );
};

export { ScreenDialog };

export type { ScreenDialogProps };
