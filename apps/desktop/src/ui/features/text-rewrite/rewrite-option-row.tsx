import { useCallback } from "react";
import type { ReactElement } from "react";

import styles from "./text-rewrite.module.css";

interface RewriteOptionRowProps {
  readonly index: number;
  readonly isSelected: boolean;
  readonly onSelect: (index: number) => void;
  readonly text: string;
}

const RewriteOptionRow = ({
  index,
  isSelected,
  onSelect,
  text,
}: RewriteOptionRowProps): ReactElement => {
  const handleChoose = useCallback((): void => {
    onSelect(index);
  }, [index, onSelect]);

  return (
    <button
      aria-pressed={isSelected}
      className={styles.option}
      type="button"
      onClick={handleChoose}
    >
      {text}
    </button>
  );
};

export { RewriteOptionRow };
