import { useId, useRef } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { SelectionContext } from "./deps.js";
import { RewritePopup } from "./rewrite-popup.js";
import { toHasText } from "./text-rewrite-model.js";
import { useRewriteView } from "./use-rewrite-view.js";
import { useTextRewrite } from "./use-text-rewrite.js";

import styles from "./text-rewrite.module.css";

interface RewriteFieldProps {
  readonly ids: { readonly directionId: string; readonly projectId: string };
  readonly target: SelectionContext;
}

const RewriteField = ({ ids, target }: RewriteFieldProps): ReactElement => {
  const rewrite = useTextRewrite(ids, target);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const state = useRewriteView(rewrite, root, trigger);
  const menuId = useId();

  return (
    <div className={styles.field}>
      <button
        aria-controls={menuId}
        aria-expanded={state.isOpen}
        aria-haspopup="menu"
        aria-label={copy.menu}
        className={styles.trigger}
        disabled={!toHasText(target) || rewrite.isPending}
        ref={trigger}
        type="button"
        onClick={state.handleToggle}
      >
        {copy.button}
      </button>
      {state.isOpen && (
        <div className={styles.popup} id={menuId} ref={root}>
          <RewritePopup rewrite={rewrite} state={state} />
        </div>
      )}
      {rewrite.error !== null && (
        <p className={styles.error} role="alert">
          {rewrite.error}
        </p>
      )}
      {rewrite.note !== null && rewrite.error === null && (
        <output className={styles.note}>{rewrite.note}</output>
      )}
    </div>
  );
};

export { RewriteField };
