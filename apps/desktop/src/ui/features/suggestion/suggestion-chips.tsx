import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { SuggestionChip } from "./suggestion-chip.js";
import {
  isChipsShown,
  toShownSuggestions,
  toTweakChip,
} from "./suggestion-model.js";
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
  const shown = toShownSuggestions(suggestions, chip);

  if (!isChipsShown(chip, shown.length)) {
    return null;
  }

  return (
    <section aria-label={copy.heading} className={styles.chips}>
      {chip !== null && <TweakChip chip={chip} onTweaks={onTweaks} />}
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
