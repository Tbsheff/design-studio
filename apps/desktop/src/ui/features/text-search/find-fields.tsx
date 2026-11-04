import { useCallback, useEffect, useRef } from "react";
import type { ChangeEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import { OptionToggle } from "./option-toggle.js";
import type { TextSearchState } from "./use-text-search.js";

import styles from "./text-search.module.css";

interface FindFieldsProps {
  readonly state: TextSearchState;
}

const GLYPHS = { caseSensitive: "Aa", regex: ".*", wholeWord: "ab" } as const;

const FindFields = ({ state }: FindFieldsProps): ReactElement => {
  const { setQuery, setReplace, toggle } = state;
  const queryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    queryRef.current?.focus();
  }, []);

  const handleQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      setQuery(event.target.value);
    },
    [setQuery]
  );

  const handleReplace = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      setReplace(event.target.value);
    },
    [setReplace]
  );

  return (
    <div className={styles.fields}>
      <div className={styles.findRow}>
        <input
          className={`ins-input ${styles.input}`}
          type="search"
          aria-label={copy.find}
          autoComplete="off"
          ref={queryRef}
          placeholder={copy.findHint}
          spellCheck={false}
          value={state.query}
          onChange={handleQuery}
        />
        <OptionToggle
          glyph={GLYPHS.caseSensitive}
          isOn={state.options.caseSensitive}
          label={copy.caseSensitive}
          name="caseSensitive"
          onToggle={toggle}
        />
        <OptionToggle
          glyph={GLYPHS.wholeWord}
          isOn={state.options.wholeWord}
          label={copy.wholeWord}
          name="wholeWord"
          onToggle={toggle}
        />
        <OptionToggle
          glyph={GLYPHS.regex}
          isOn={state.options.regex}
          label={copy.regex}
          name="regex"
          onToggle={toggle}
        />
      </div>
      <input
        className={`ins-input ${styles.input}`}
        type="text"
        aria-label={copy.replace}
        autoComplete="off"
        placeholder={copy.replaceHint}
        spellCheck={false}
        value={state.replace}
        onChange={handleReplace}
      />
    </div>
  );
};

export { FindFields };
