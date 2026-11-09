import { useCallback } from "react";
import type { ReactElement } from "react";

import { toKindLabel } from "./suggestion-model.js";
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
  const { kind, prompt } = suggestion;

  const handlePick = useCallback((): void => {
    onPick(prompt);
  }, [onPick, prompt]);

  return (
    <button
      className={styles.chip}
      data-kind={kind}
      type="button"
      onClick={handlePick}
    >
      <span className={styles.kind}>{toKindLabel(kind)}</span>
      <span className={styles.text}>{prompt}</span>
    </button>
  );
};

export { SuggestionChip };
