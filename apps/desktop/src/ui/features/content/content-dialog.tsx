import { useCallback } from "react";
import type { ReactElement } from "react";

import { ContentPanel } from "./content-panel.js";
import { copy } from "./copy.js";
import { useModalDialog } from "./deps.js";
import type { ContentTarget } from "./use-content-host.js";

import styles from "./content.module.css";

interface ContentDialogProps {
  readonly onClose: () => void;
  readonly opened: ContentTarget;
}

const ContentDialog = ({
  onClose,
  opened,
}: ContentDialogProps): ReactElement => {
  const handleDismiss = useCallback((): boolean => {
    onClose();

    return true;
  }, [onClose]);

  const { ref } = useModalDialog(handleDismiss);

  return (
    <dialog
      aria-label={copy.groupLabel}
      className={`modal ${styles.dialog}`}
      ref={ref}
    >
      <ContentPanel
        directionId={opened.directionId}
        projectId={opened.projectId}
        target={opened.target}
      />
      <div className={styles.foot}>
        <button className={styles.secondary} onClick={onClose} type="button">
          {copy.close}
        </button>
      </div>
    </dialog>
  );
};

export { ContentDialog };
