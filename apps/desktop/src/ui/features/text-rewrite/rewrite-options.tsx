import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { RewriteOptionRow } from "./rewrite-option-row.js";
import type { TextRewrite } from "./use-text-rewrite.js";

import styles from "./text-rewrite.module.css";

interface RewriteOptionsProps {
  readonly onApply: () => void;
  readonly onCancel: () => void;
  readonly rewrite: TextRewrite;
}

const RewriteOptions = ({
  onApply,
  onCancel,
  rewrite,
}: RewriteOptionsProps): ReactElement => {
  const { select: handleSelect } = rewrite;

  return (
    <div className={styles.options}>
      <div className={styles.list}>
        {(rewrite.result?.options ?? []).map((text, index) => (
          <RewriteOptionRow
            key={text}
            index={index}
            isSelected={index === rewrite.selected}
            text={text}
            onSelect={handleSelect}
          />
        ))}
      </div>
      <div className={styles.actions}>
        <button className="btn small" type="button" onClick={onCancel}>
          {copy.cancel}
        </button>
        <button
          aria-label={copy.applyLabel}
          className="btn small primary"
          disabled={rewrite.isPending}
          type="button"
          onClick={onApply}
        >
          {copy.apply}
        </button>
      </div>
    </div>
  );
};

export { RewriteOptions };
