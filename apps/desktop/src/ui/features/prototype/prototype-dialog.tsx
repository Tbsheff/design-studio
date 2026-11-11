import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { useModalDialog } from "./deps.js";
import { PrototypeField } from "./prototype-field.js";
import { PrototypeFoot } from "./prototype-foot.js";
import { usePrototypeCreate } from "./use-prototype-create.js";

import styles from "./prototype.module.css";

interface PrototypeDialogProps {
  readonly appProjectId: string;
  readonly onClose: () => void;
  readonly onCreated: (projectId: string) => void;
}

const PrototypeDialog = ({
  appProjectId,
  onClose,
  onCreated,
}: PrototypeDialogProps): ReactElement => {
  const { ref } = useModalDialog(onClose);
  const create = usePrototypeCreate(appProjectId, onCreated);
  const { handlePrompt, handleSubmit } = create;

  return (
    <dialog
      ref={ref}
      className={styles.sheet}
      aria-label={copy.dialog}
      data-testid="prototype-dialog"
    >
      <form className={styles.form} onSubmit={handleSubmit}>
        <h2 className={styles.title}>{copy.title}</h2>
        <PrototypeField onPrompt={handlePrompt} prompt={create.prompt} />
        <PrototypeFoot
          failure={create.failure}
          isEmpty={create.prompt.trim() === ""}
          isPending={create.isPending}
          onCancel={onClose}
        />
      </form>
    </dialog>
  );
};

export { PrototypeDialog };

export type { PrototypeDialogProps };
