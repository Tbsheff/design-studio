import type { ReactElement } from "react";
import { useCallback } from "react";

import { copy } from "./copy.js";
import type { ExportFormat } from "./use-animation-actions.js";

import styles from "./animation.module.css";

interface ExportButtonsProps {
  readonly isBusy: boolean;
  readonly onExport: (format: ExportFormat) => void;
}

const ExportButtons = ({
  isBusy,
  onExport,
}: ExportButtonsProps): ReactElement => {
  const handleCss = useCallback((): void => onExport("css"), [onExport]);
  const handleReact = useCallback((): void => onExport("react"), [onExport]);
  const handleWebm = useCallback((): void => onExport("webm"), [onExport]);

  return (
    <>
      <button
        className={styles.small}
        disabled={isBusy}
        onClick={handleCss}
        type="button"
      >
        {copy.exportCss}
      </button>
      <button
        className={styles.small}
        disabled={isBusy}
        onClick={handleReact}
        type="button"
      >
        {copy.exportReact}
      </button>
      <button
        className={styles.small}
        disabled={isBusy}
        onClick={handleWebm}
        type="button"
      >
        {copy.exportWebm}
      </button>
    </>
  );
};

export { ExportButtons };
