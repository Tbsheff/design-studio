import { useCallback } from "react";
import type { ReactElement } from "react";

import type { Suggestion } from "./suggestion-model.js";

import styles from "./suggestion.module.css";

interface SuggestionChipProps {
  readonly suggestion: Suggestion;
  readonly onPick: (prompt: string) => void;
}

const SuggestionChip = ({
  suggestion,
  onPick,
}: SuggestionChipProps): ReactElement => {
  const { prompt } = suggestion;

  const handlePick = useCallback((): void => {
    onPick(prompt);
  }, [onPick, prompt]);

  return (
    <button className={styles.chip} type="button" onClick={handlePick}>
      {prompt}
    </button>
  );
};

export { SuggestionChip };
