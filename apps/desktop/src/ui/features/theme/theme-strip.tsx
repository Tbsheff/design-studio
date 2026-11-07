import { useCallback, useState } from "react";
import type { ChangeEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import { ThemeCard } from "./theme-card.js";
import { useThemeStrip } from "./use-theme-strip.js";
import type { ThemeStripSetup } from "./use-theme-strip.js";

import styles from "./theme.module.css";

const ThemeStrip = (setup: ThemeStripSetup): ReactElement => {
  const strip = useThemeStrip(setup);
  const [brief, setBrief] = useState("");
  const { handleShuffle } = strip;

  const handleBrief = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setBrief(event.target.value);
  }, []);

  const handleNewSet = useCallback(
    () => handleShuffle(brief),
    [brief, handleShuffle]
  );

  let shuffleLabel: string = copy.shuffle;

  if (strip.isBusy) {
    shuffleLabel = copy.shuffling;
  }

  return (
    <section aria-label={copy.title} className={styles.strip}>
      <div className={styles.head}>
        <h3 className={styles.title}>{copy.title}</h3>
        <button
          className={styles.shuffle}
          data-tip={copy.shuffleTip}
          disabled={strip.isBusy}
          onClick={handleNewSet}
          type="button"
        >
          {shuffleLabel}
        </button>
      </div>
      <input
        aria-label={copy.briefLabel}
        className={styles.brief}
        onChange={handleBrief}
        placeholder={copy.briefPlaceholder}
        spellCheck={false}
        type="text"
        value={brief}
      />
      <span className={styles.error} role="alert">
        {strip.error}
      </span>
      {strip.items.length === 0 && (
        <span className={styles.note}>{copy.empty}</span>
      )}
      <ul className={styles.grid}>
        {strip.items.map((item) => (
          <ThemeCard
            isBusy={strip.isBusy}
            item={item}
            key={item.id}
            onApply={strip.handleApply}
            onToggle={strip.handleToggle}
          />
        ))}
      </ul>
      {strip.items.some((item) => item.isActive) && (
        <span className={styles.note}>
          {`${copy.writes}: ${strip.items[0]?.tokenFile ?? ""}`}
        </span>
      )}
    </section>
  );
};

export { ThemeStrip };
