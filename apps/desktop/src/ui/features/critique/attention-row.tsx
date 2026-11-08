import { useCallback } from "react";
import type { ReactElement } from "react";

import { toShareLabel } from "./attention-model.js";
import type { AttentionElementView } from "./attention-model.js";
import { copy } from "./copy.js";

import styles from "./critique.module.css";

interface RowProps {
  readonly element: AttentionElementView;
  readonly onSelect: (selector: string) => void;
}

const AttentionRow = ({ element, onSelect }: RowProps): ReactElement => {
  const { selector } = element;

  const handleSelect = useCallback(() => {
    onSelect(selector);
  }, [onSelect, selector]);

  return (
    <li className="review-row">
      <button
        className="review-target"
        data-tip={copy.attention.select}
        onClick={handleSelect}
        type="button"
      >
        <span className={styles.rank}>{element.rank}</span>
        <span className="truncate">{element.label}</span>
        <span className={styles.share}>{toShareLabel(element.share)}</span>
      </button>
    </li>
  );
};

export { AttentionRow };
