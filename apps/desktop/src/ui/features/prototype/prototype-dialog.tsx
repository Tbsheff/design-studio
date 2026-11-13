import type { ReactElement } from "react";

import { useModalDialog } from "./deps.js";
import { PrototypeField } from "./prototype-field.js";
import { PrototypeFoot } from "./prototype-foot.js";
import { toPrototypeText } from "./prototype-model.js";
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
  const { handlePrompt, handleSubmit, routePath } = create;
  const text = toPrototypeText(routePath);

  return (
    <dialog
      ref={ref}
      className={styles.sheet}
      aria-label={text.title}
      data-testid="prototype-dialog"
    >
      <form className={styles.form} onSubmit={handleSubmit}>
        <h2 className={styles.title}>{text.title}</h2>
        <PrototypeField
          onPrompt={handlePrompt}
          prompt={create.prompt}
          text={text}
        />
        <PrototypeFoot
          failure={create.failure}
          isEmpty={create.prompt.trim() === ""}
          isPending={create.isPending}
          onCancel={onClose}
          routePath={routePath}
        />
      </form>
    </dialog>
  );
};

export { PrototypeDialog };

export type { PrototypeDialogProps };
