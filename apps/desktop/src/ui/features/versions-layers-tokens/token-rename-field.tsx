import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

import { TOKEN_RENAME_COPY } from "./token-rename-copy.js";
import { toUsesText } from "./token-rename-model.js";
import type { TokenRename } from "./use-token-rename.js";

import styles from "./token-rename.module.css";

interface TokenRenameFieldProps {
  readonly name: string;
  readonly rename: TokenRename;
  readonly useCount: number | null;
}

const TokenRenameField = ({
  name,
  rename,
  useCount,
}: TokenRenameFieldProps): ReactNode => {
  const input = useRef<HTMLInputElement>(null);
  let saveLabel: string = TOKEN_RENAME_COPY.save;

  if (rename.isPending) {
    saveLabel = TOKEN_RENAME_COPY.saving;
  }

  useEffect(() => {
    input.current?.focus({ preventScroll: true });
    input.current?.select();
  }, []);

  return (
    <form className={styles.form} onSubmit={rename.handleSubmit}>
      <input
        ref={input}
        name="token-name"
        className={`mono ${styles.input}`}
        value={rename.draft}
        spellCheck={false}
        autoComplete="off"
        aria-label={`${TOKEN_RENAME_COPY.fieldLabel}${name}`}
        aria-invalid={rename.error !== null}
        onChange={rename.handleChange}
        onKeyDown={rename.handleKeyDown}
      />
      {useCount !== null && (
        <p className={styles.note} data-testid="token-rename-note">
          {toUsesText(useCount)}
        </p>
      )}
      {rename.error && (
        <p className={styles.error} role="alert">
          {rename.error}
        </p>
      )}
      <div className={styles.actions}>
        <button
          type="button"
          className="btn small"
          onClick={rename.handleCancel}
        >
          {TOKEN_RENAME_COPY.cancel}
        </button>
        <button
          type="submit"
          className="btn small primary"
          disabled={!rename.isReady || rename.isPending}
        >
          {saveLabel}
        </button>
      </div>
    </form>
  );
};

export { TokenRenameField };
