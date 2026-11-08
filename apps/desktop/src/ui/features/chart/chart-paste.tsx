import { useCallback, useState } from "react";
import type { ChangeEvent, Dispatch, ReactElement } from "react";

import type { DraftAction } from "./chart-draft-model.js";
import { copy } from "./copy.js";

import styles from "./chart.module.css";

interface ChartPasteProps {
  readonly dispatch: Dispatch<DraftAction>;
}

const ChartPaste = ({ dispatch }: ChartPasteProps): ReactElement => {
  const [text, setText] = useState("");

  const handleText = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>): void =>
      setText(event.target.value),
    []
  );

  const handleApply = useCallback((): void => {
    dispatch({ kind: "paste", text });
    setText("");
  }, [dispatch, text]);

  return (
    <details className={styles.paste}>
      <summary>{copy.pasteLabel}</summary>
      <p className={styles.note}>{copy.pasteHint}</p>
      <textarea
        aria-label={copy.pasteLabel}
        className={styles.textarea}
        onChange={handleText}
        placeholder={copy.pastePlaceholder}
        rows={4}
        value={text}
      />
      <div className={styles.actions}>
        <button
          className={styles.small}
          disabled={text.trim() === ""}
          onClick={handleApply}
          type="button"
        >
          {copy.apply}
        </button>
      </div>
    </details>
  );
};

export { ChartPaste };
