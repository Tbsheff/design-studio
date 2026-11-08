import type { ReactNode } from "react";

import { COPY } from "./copy.js";
import type { TokenExportView } from "./use-token-export.js";

import styles from "./token-export.module.css";

interface TokenExportResultProps {
  readonly isCopied: boolean;
  readonly onCopy: () => void;
  readonly onSave: () => void;
  readonly view: TokenExportView;
}

const toCounts = (view: TokenExportView): string =>
  `${String(view.tokenCount)} tokens, ${String(view.aliasCount)} aliases`;

const toSkipped = (view: TokenExportView): string =>
  view.skipped.map((item) => `${item.name} (${item.reason})`).join(", ");

const toCopyLabel = (isCopied: boolean): string => {
  if (isCopied) {
    return COPY.exportCopied;
  }

  return COPY.exportCopy;
};

const TokenExportResult = ({
  isCopied,
  onCopy,
  onSave,
  view,
}: TokenExportResultProps): ReactNode => (
  <section className={styles.result} aria-label={COPY.exportTitle}>
    <div className={styles.head}>
      <span className={styles.file}>{view.fileName}</span>
      <span className={styles.count}>{toCounts(view)}</span>
      <button type="button" className={styles.action} onClick={onCopy}>
        {toCopyLabel(isCopied)}
      </button>
      <button type="button" className={styles.action} onClick={onSave}>
        {COPY.exportSave}
      </button>
    </div>
    {view.skipped.length > 0 && (
      <p className={styles.skipped}>
        {COPY.exportSkippedPrefix}
        {toSkipped(view)}
      </p>
    )}
    <textarea
      className={styles.text}
      aria-label={view.fileName}
      readOnly
      spellCheck={false}
      value={view.text}
    />
  </section>
);

export { TokenExportResult };
