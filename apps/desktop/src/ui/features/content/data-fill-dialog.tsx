import type { ReactElement } from "react";

import { dataFill } from "./copy.js";
import { PreviewTable } from "./preview-table.js";
import { useDataFill } from "./use-data-fill.js";
import type { DataFillOptions } from "./use-data-fill.js";

import styles from "./content.module.css";

const DataFillDialog = (props: DataFillOptions): ReactElement => {
  const fill = useDataFill(props);
  const { preview } = fill;

  if (!fill.isOpen) {
    return (
      <button
        className={styles.fillToggle}
        onClick={fill.handleToggle}
        type="button"
      >
        {dataFill.open}
      </button>
    );
  }

  return (
    <div className={styles.fill}>
      <button
        aria-expanded
        className={styles.fillToggle}
        onClick={fill.handleToggle}
        type="button"
      >
        {dataFill.open}
      </button>
      <textarea
        aria-label={dataFill.pasteLabel}
        className={styles.paste}
        onChange={fill.handleText}
        placeholder={dataFill.placeholder}
        value={fill.text}
      />
      {preview.total > 0 && <PreviewTable preview={preview} />}
      <span className={styles.note}>{fill.note}</span>
      <div className={styles.actions}>
        <button
          aria-label={dataFill.applyLabel}
          className={styles.primary}
          disabled={!fill.canApply || fill.isBusy}
          onClick={fill.handleApply}
          type="button"
        >
          {dataFill.apply}
        </button>
      </div>
      <span className={styles.note}>{fill.filledText}</span>
      <span className={styles.error} role="alert">
        {fill.error}
      </span>
    </div>
  );
};

export { DataFillDialog };
