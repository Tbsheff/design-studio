import { useCallback, useState } from "react";
import type { ChangeEvent, ReactElement } from "react";

import { copy } from "./copy.js";

import styles from "./pattern.module.css";

interface PatternPageControlsProps {
  readonly isBusy: boolean;
  readonly onPage: (patternId: string, page: string) => void;
  readonly patternId: string;
}

const PatternPageControls = ({
  isBusy,
  onPage,
  patternId,
}: PatternPageControlsProps): ReactElement => {
  const [page, setPage] = useState("");

  const handlePage = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => setPage(event.target.value),
    []
  );

  const handleAdd = useCallback(
    (): void => onPage(patternId, page.trim()),
    [onPage, page, patternId]
  );

  return (
    <div className={styles.actions}>
      <input
        aria-label={copy.pageLabel}
        className={styles.input}
        onChange={handlePage}
        placeholder={copy.pagePlaceholder}
        value={page}
      />
      <button
        className={styles.small}
        data-tip={copy.pageTip}
        disabled={isBusy || page.trim() === ""}
        onClick={handleAdd}
        type="button"
      >
        {copy.pageAdd}
      </button>
    </div>
  );
};

export { PatternPageControls };
