import type { ReactNode } from "react";

import { TOKEN_RENAME_COPY } from "./token-rename-copy.js";
import type { TokenDelete } from "./use-token-delete.js";

import styles from "./token-rename.module.css";

interface TokenDeleteConfirmProps {
  readonly name: string;
  readonly remove: TokenDelete;
}

const TokenDeleteConfirm = ({
  name,
  remove,
}: TokenDeleteConfirmProps): ReactNode => {
  let confirmLabel: string = TOKEN_RENAME_COPY.deleteConfirm;

  if (remove.isPending) {
    confirmLabel = TOKEN_RENAME_COPY.deleting;
  }

  return (
    <fieldset className={styles.form} data-testid="token-delete-confirm">
      <p className={styles.note}>
        {TOKEN_RENAME_COPY.deleteNotePrefix}
        <code>{name}</code>
        {TOKEN_RENAME_COPY.deleteNoteSuffix}
      </p>
      {remove.error && (
        <p className={styles.error} role="alert">
          {remove.error}
        </p>
      )}
      <div className={styles.actions}>
        <button
          type="button"
          className="btn small"
          onClick={remove.handleCancel}
        >
          {TOKEN_RENAME_COPY.cancel}
        </button>
        <button
          type="button"
          className="btn small danger"
          disabled={remove.isPending}
          onClick={remove.handleConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </fieldset>
  );
};

export { TokenDeleteConfirm };
