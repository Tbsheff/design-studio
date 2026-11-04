import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { ExportResult } from "./use-animation-actions.js";

import styles from "./animation.module.css";

interface ExportResultProps {
  readonly result: ExportResult;
}

const copyText = async (text: string): Promise<void> => {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    await Promise.resolve();
  }
};

const ExportResultView = ({ result }: ExportResultProps): ReactElement => {
  const { code } = result;

  const handleCopy = useCallback((): void => {
    if (code !== null) {
      copyText(code);
    }
  }, [code]);

  return (
    <div className={styles.exported}>
      {code !== null && (
        <textarea
          aria-label={result.format}
          className={styles.code}
          readOnly
          value={code}
        />
      )}
      {code !== null && (
        <button className={styles.small} onClick={handleCopy} type="button">
          {copy.copy}
        </button>
      )}
      {result.path !== null && (
        <code className={styles.path}>{result.path}</code>
      )}
      {result.notes.map((note) => (
        <p key={note} className={styles.note}>
          {note}
        </p>
      ))}
    </div>
  );
};

export { ExportResultView };
