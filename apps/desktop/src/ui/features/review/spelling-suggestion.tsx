import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

import styles from "./spelling.module.css";

interface SpellingSuggestionProps {
  readonly isBusy: boolean;
  readonly onFix: (word: string, suggestion: string) => void;
  readonly suggestion: string;
  readonly word: string;
}

const SpellingSuggestion = ({
  isBusy,
  onFix,
  suggestion,
  word,
}: SpellingSuggestionProps): ReactElement => {
  const fixWord = useCallback((): void => {
    onFix(word, suggestion);
  }, [onFix, suggestion, word]);

  return (
    <button
      className={styles.chip}
      data-tip={copy.spellingFixTip}
      disabled={isBusy}
      onClick={fixWord}
      type="button"
    >
      {suggestion}
    </button>
  );
};

export { SpellingSuggestion };
