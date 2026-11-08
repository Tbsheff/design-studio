import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { ThemeImportFields } from "./theme-import-fields.js";
import { useThemeImport } from "./use-theme-import.js";
import type { ThemeImportSetup } from "./use-theme-import.js";

import styles from "./theme.module.css";

interface ThemeImportRowProps extends ThemeImportSetup {
  readonly isBusy: boolean;
}

const ThemeImportRow = ({
  directionId,
  isBusy,
  projectId,
}: ThemeImportRowProps): ReactElement => {
  const source = useThemeImport({ directionId, projectId });

  return (
    <div className={styles.importRow}>
      <span className={styles.importTitle}>{copy.importTitle}</span>
      <ThemeImportFields
        isBusy={isBusy}
        isImporting={source.isBusy}
        onImage={source.handleImage}
        onUrl={source.handleUrl}
      />
      <span className={styles.error} role="alert">
        {source.error}
      </span>
    </div>
  );
};

export { ThemeImportRow };
