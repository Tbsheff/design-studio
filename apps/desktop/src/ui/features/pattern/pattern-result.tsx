import { useMemo } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { PatternInserted } from "./pattern-model.js";
import { PatternNoteList } from "./pattern-note-list.js";

import styles from "./pattern.module.css";

interface PatternResultProps {
  readonly result: PatternInserted;
}

const PatternResult = ({ result }: PatternResultProps): ReactElement => {
  const imports = useMemo(
    () => result.unmappedImports.map((item) => `${item.name}: ${item.reason}`),
    [result.unmappedImports]
  );

  const tokens = useMemo(
    () => result.unmappedTokens.map((item) => `${item.name}: ${item.reason}`),
    [result.unmappedTokens]
  );

  return (
    <output className={styles.result}>
      <strong>{`${copy.inserted}: ${result.title}`}</strong>
      <span className={styles.note}>{result.file}</span>
      {result.note !== null && (
        <span className={styles.note}>{result.note}</span>
      )}
      <PatternNoteList items={imports} label={copy.unmappedImports} />
      <PatternNoteList items={tokens} label={copy.unmappedTokens} />
      <PatternNoteList items={result.unresolvedNames} label={copy.unresolved} />
      <PatternNoteList items={result.dropped} label={copy.dropped} />
    </output>
  );
};

export { PatternResult };
