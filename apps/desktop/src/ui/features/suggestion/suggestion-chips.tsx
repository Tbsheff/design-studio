import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { SuggestionChip } from "./suggestion-chip.js";
import { isChipsShown, toTweakChip } from "./suggestion-model.js";
import type { SuggestionRunIds } from "./suggestion-model.js";
import { TweakChip } from "./tweak-chip.js";
import { useSuggestions } from "./use-suggestions.js";

import styles from "./suggestion.module.css";

interface SuggestionChipsProps {
  readonly ids: SuggestionRunIds;
  readonly isAppProject: boolean;
  readonly onPick: (prompt: string) => void;
  readonly onTweaks: () => void;
  readonly tweakCount: number | null;
}

const SuggestionChips = ({
  ids,
  isAppProject,
  onPick,
  onTweaks,
  tweakCount,
}: SuggestionChipsProps): ReactElement | null => {
  const { suggestions } = useSuggestions(ids);
  const chip = toTweakChip(tweakCount, isAppProject);

  if (!isChipsShown(chip, suggestions.length)) {
    return null;
  }

  return (
    <section aria-label={copy.heading} className={styles.chips}>
      <h3 className={styles.heading}>{copy.heading}</h3>
      <div className={styles.list}>
        {chip !== null && <TweakChip chip={chip} onTweaks={onTweaks} />}
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
