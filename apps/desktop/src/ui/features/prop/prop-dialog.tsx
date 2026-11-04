import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { useModalDialog } from "./deps.js";
import { PropPanel } from "./prop-panel.js";
import type { PropPanelProps } from "./prop-panel.js";

import styles from "./prop.module.css";

const PropDialog = ({
  layer,
  onClose,
  onDone,
  target,
}: PropPanelProps): ReactElement => {
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
      <PropPanel
        layer={layer}
        onClose={onClose}
        onDone={onDone}
        target={target}
      />
    </dialog>
  );
};

export { PropDialog };
