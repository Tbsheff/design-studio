import { useCallback, useMemo } from "react";
import type { ReactElement } from "react";

import { copy, countText } from "./copy.js";
import type { TextSearchState } from "./use-text-search.js";

import styles from "./text-search.module.css";

interface FindStatusProps {
  readonly state: TextSearchState;
}

const summaryOf = (state: TextSearchState): string => {
  if (state.isReplacing) {
    return copy.replacing;
  }

  if (state.isSearching) {
    return copy.searching;
  }

  if (state.result === null) {
    return "";
  }

  if (state.result.hits.length === 0) {
    return copy.empty;
  }

  return countText(state.result.total, state.groups.length);
};

const FindStatus = ({ state }: FindStatusProps): ReactElement => {
  const { activeId, replaceAll, replaceOne, result } = state;
  const hits = useMemo(() => result?.hits ?? [], [result]);
  const isIdle = !state.isReplacing && hits.length > 0;

  const handleReplace = useCallback((): void => {
    const hit = hits.find((entry) => entry.id === activeId) ?? hits[0];

    if (hit) {
      replaceOne(hit);
    }
  }, [activeId, hits, replaceOne]);

  return (
    <div className={styles.status}>
      <div className={styles.bar}>
        <output className={styles.summary} aria-live="polite">
          {summaryOf(state)}
        </output>
        <button
          type="button"
          className="btn small"
          disabled={!isIdle}
          onClick={handleReplace}
        >
          {copy.replace}
        </button>
        <button
          type="button"
          className="btn small primary"
          disabled={!isIdle}
          onClick={replaceAll}
        >
          {copy.replaceAll}
        </button>
      </div>
      {result?.truncated === true && <p className={styles.note}>{copy.more}</p>}
      {state.notice !== null && (
        <output className={styles.notice}>{state.notice}</output>
      )}
      {state.error !== null && (
        <p className={styles.problem} role="alert">
          {state.error}
        </p>
      )}
    </div>
  );
};

export { FindStatus };
