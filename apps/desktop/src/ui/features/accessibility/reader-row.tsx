import { useCallback, useMemo } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { isTextLine } from "./reader-model.js";
import type { ReaderRowView } from "./reader-model.js";

import styles from "./accessibility.module.css";

interface ReaderRowProps {
  readonly onHover: (selector: string | null) => void;
  readonly onSelect: (selector: string) => void;
  readonly row: ReaderRowView;
}

const INDENT = 12;

const ROW_PAD = 8;

const toRowClass = (row: ReaderRowView): string => {
  if (row.line.isNameMissing) {
    return `${styles.readerRow} ${styles.readerMissing}`;
  }

  if (isTextLine(row.line)) {
    return `${styles.readerRow} ${styles.readerText}`;
  }

  return styles.readerRow ?? "";
};

const ReaderRow = ({
  onHover,
  onSelect,
  row,
}: ReaderRowProps): ReactElement => {
  const { selector } = row.line;

  const indent = useMemo(
    () => ({ paddingInlineStart: ROW_PAD + row.line.depth * INDENT }),
    [row.line.depth]
  );

  const enter = useCallback(() => onHover(selector), [onHover, selector]);

  const choose = useCallback(() => onSelect(selector), [onSelect, selector]);

  const leave = useCallback(() => onHover(null), [onHover]);

  return (
    <li>
      <button
        className={toRowClass(row)}
        data-tip={copy.readerRowTip}
        style={indent}
        type="button"
        onClick={choose}
        onFocus={enter}
        onBlur={leave}
        onMouseEnter={enter}
        onMouseLeave={leave}
      >
        {row.line.isNameMissing && (
          <span
            aria-hidden="true"
            className={styles.readerWarn}
            data-tip={copy.readerNoNameTip}
          >
            {copy.unnamedMark}
          </span>
        )}
        <span className={styles.readerLabel}>{row.text}</span>
      </button>
    </li>
  );
};

export { ReaderRow };
