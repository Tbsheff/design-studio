import type { ReactElement } from "react";

import styles from "./pattern.module.css";

interface PatternNoteListProps {
  readonly items: readonly string[];
  readonly label: string;
}

const PatternNoteList = ({
  items,
  label,
}: PatternNoteListProps): ReactElement | null => {
  if (items.length === 0) {
    return null;
  }

  return (
    <div>
      <span>{label}</span>
      <ul className={styles.resultList}>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
};

export { PatternNoteList };
