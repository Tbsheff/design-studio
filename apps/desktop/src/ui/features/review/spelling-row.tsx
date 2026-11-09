import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { toFirstSelector } from "./spelling-model.js";
import type { SpellingHitView } from "./spelling-model.js";
import { SpellingSuggestion } from "./spelling-suggestion.js";

import styles from "./spelling.module.css";

interface SpellingRowProps {
  readonly hit: SpellingHitView;
  readonly isBusy: boolean;
  readonly onAdd: (word: string) => void;
  readonly onFix: (word: string, suggestion: string) => void;
  readonly onSelect: (selector: string) => void;
}

const SpellingRow = ({
  hit,
  isBusy,
  onAdd,
  onFix,
  onSelect,
}: SpellingRowProps): ReactElement => {
  const selector = toFirstSelector(hit);

  const selectHit = useCallback((): void => {
    if (selector !== null) {
      onSelect(selector);
    }
  }, [onSelect, selector]);

  const addHit = useCallback((): void => {
    onAdd(hit.word);
  }, [hit.word, onAdd]);

  return (
    <li className="review-row">
      <button
        className="review-target"
        data-tip={copy.spellingSelectTip}
        disabled={selector === null}
        onClick={selectHit}
        type="button"
      >
        <span className="review-sev medium" />
        <span className="truncate">{hit.word}</span>
        {hit.count > 1 && (
          <span className="review-count num">{`${copy.times}${hit.count}`}</span>
        )}
      </button>
      <div className="review-actions">
        {hit.suggestions.map((suggestion) => (
          <SpellingSuggestion
            isBusy={isBusy}
            key={suggestion}
            onFix={onFix}
            suggestion={suggestion}
            word={hit.word}
          />
        ))}
        <button
          className={styles.add}
          data-tip={copy.spellingAddTip}
          data-tip-align="end"
          disabled={isBusy}
          onClick={addHit}
          type="button"
        >
          {copy.spellingAdd}
        </button>
      </div>
    </li>
  );
};

export { SpellingRow };
