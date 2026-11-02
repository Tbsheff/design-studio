import { useCallback, useEffect, useId, useMemo, useRef } from "react";
import type { ReactElement, SyntheticEvent } from "react";

import { copy } from "./copy.js";
import type { CanvasFrame } from "./deps.js";
import { DialogBody } from "./dialog-body.js";
import { DialogFoot } from "./dialog-foot.js";
import { usePageImport } from "./use-page-import.js";

import styles from "./page-import.module.css";

interface ImportPageDialogProps {
  readonly directionId: string;
  readonly onClose: () => void;
  readonly onImported: (frame: CanvasFrame) => void;
  readonly projectId: string;
}

const ImportPageDialog = (props: ImportPageDialogProps): ReactElement => {
  const { directionId, onClose, onImported, projectId } = props;
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const formId = useId();

  const ids = useMemo(
    () => ({ directionId, projectId }),
    [directionId, projectId]
  );

  const close = useCallback(() => {
    onClose();

    if (opener.current?.isConnected) {
      opener.current.focus();
    }
  }, [onClose]);

  const handleDone = useCallback(
    (frame: CanvasFrame) => {
      onImported(frame);
      onClose();
    },
    [onClose, onImported]
  );

  const state = usePageImport(ids, handleDone);
  const { isPending } = state;

  useEffect(() => {
    if (document.activeElement instanceof HTMLElement) {
      opener.current = document.activeElement;
    }

    ref.current?.showModal();
  }, []);

  const handleCancel = useCallback(
    (event: SyntheticEvent): void => {
      event.preventDefault();

      if (!isPending) {
        close();
      }
    },
    [close, isPending]
  );

  return (
    <dialog
      ref={ref}
      className={styles.sheet}
      aria-label={copy.title}
      aria-busy={isPending}
      onCancel={handleCancel}
    >
      <h2 className={styles.title}>{copy.title}</h2>
      <DialogBody formId={formId} state={state} />
      <DialogFoot formId={formId} state={state} onClose={close} />
    </dialog>
  );
};

export { ImportPageDialog };

export type { ImportPageDialogProps };
