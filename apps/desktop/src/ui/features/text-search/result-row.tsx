import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { TextHit } from "./deps.js";
import { HitSnippet } from "./hit-snippet.js";

import styles from "./text-search.module.css";

interface ResultRowProps {
  readonly hit: TextHit;
  readonly isActive: boolean;
  readonly isBusy: boolean;
  readonly onPick: (hit: TextHit) => void;
  readonly onReplace: (hit: TextHit) => void;
}

const ResultRow = ({
  hit,
  isActive,
  isBusy,
  onPick,
  onReplace,
}: ResultRowProps): ReactElement => {
  const handlePick = useCallback((): void => {
    onPick(hit);
  }, [hit, onPick]);

  const handleReplace = useCallback((): void => {
    onReplace(hit);
  }, [hit, onReplace]);

  return (
    <li className={styles.row} data-active={isActive}>
      <button
        type="button"
        className={styles.hit}
        aria-current={isActive}
        data-tip={`${hit.layer.tag} · ${hit.file}:${hit.line}`}
        onClick={handlePick}
      >
        <HitSnippet hit={hit} />
        <span className={styles.line}>{hit.line}</span>
      </button>
      <button
        type="button"
        className={styles.rowReplace}
        aria-label={copy.replace}
        data-tip={copy.replace}
        disabled={isBusy}
        onClick={handleReplace}
      >
        {copy.replace}
      </button>
    </li>
  );
};

export { ResultRow };
