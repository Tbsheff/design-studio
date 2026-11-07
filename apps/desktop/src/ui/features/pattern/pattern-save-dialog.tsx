import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { useModalDialog } from "./deps.js";
import { PatternSaveForm } from "./pattern-save-form.js";
import type { PatternSaveSetup } from "./use-pattern-save.js";

import styles from "./pattern.module.css";

const PatternSaveDialog = ({
  directionId,
  onClose,
  onDone,
  projectId,
  target,
}: PatternSaveSetup): ReactElement => {
  const handleDismiss = useCallback((): boolean => {
    onClose();

    return true;
  }, [onClose]);

  const { ref } = useModalDialog(handleDismiss);

  return (
    <dialog
      aria-label={copy.title}
      className={`modal ${styles.dialog}`}
      ref={ref}
    >
      <PatternSaveForm
        directionId={directionId}
        onClose={onClose}
        onDone={onDone}
        projectId={projectId}
        target={target}
      />
    </dialog>
  );
};

export { PatternSaveDialog };
