import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { SuggestionChip } from "./suggestion-chip.js";
import type { SuggestionRunIds } from "./suggestion-model.js";
import { useSuggestions } from "./use-suggestions.js";

import styles from "./suggestion.module.css";

interface SuggestionChipsProps {
  readonly ids: SuggestionRunIds;
  readonly onPick: (prompt: string) => void;
}

const SuggestionChips = ({
  ids,
  onPick,
}: SuggestionChipsProps): ReactElement | null => {
  const { suggestions } = useSuggestions(ids);

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <section aria-label={copy.heading} className={styles.chips}>
      <h3 className={styles.heading}>{copy.heading}</h3>
      <div className={styles.list}>
        {suggestions.map((suggestion) => (
          <SuggestionChip
            key={suggestion.prompt}
            suggestion={suggestion}
            onPick={onPick}
          />
        ))}
      </div>
    </section>
  );
};

export { SuggestionChips };

export type { SuggestionChipsProps };
