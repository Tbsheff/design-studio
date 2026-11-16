import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { SuggestionChip } from "./suggestion-chip.js";
import { toShownSuggestions } from "./suggestion-model.js";
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
  const shown = toShownSuggestions(suggestions);

  if (shown.length === 0) {
    return null;
  }

  return (
    <section aria-label={copy.label} className={styles.chips}>
      {shown.map((suggestion) => (
        <SuggestionChip
          key={suggestion.prompt}
          suggestion={suggestion}
          onPick={onPick}
        />
      ))}
    </section>
  );
};

export { SuggestionChips };

export type { SuggestionChipsProps };
