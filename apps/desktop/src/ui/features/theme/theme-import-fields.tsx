import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { useImportFields } from "./use-import-fields.js";

import styles from "./theme.module.css";

const IMAGE_ICON_SIZE = 14;

interface ThemeImportFieldsProps {
  readonly isBusy: boolean;
  readonly isImporting: boolean;
  readonly onImage: (file: File) => void;
  readonly onUrl: (url: string) => void;
}

const ThemeImportFields = ({
  isBusy,
  isImporting,
  onImage,
  onUrl,
}: ThemeImportFieldsProps): ReactElement => {
  const fields = useImportFields({ onImage, onUrl });
  const isDisabled = isBusy || isImporting;

  let importLabel: string = copy.importAction;

  if (isImporting) {
    importLabel = copy.importing;
  }

  return (
    <div className={styles.importFields}>
      <input
        aria-label={copy.importUrlLabel}
        className={styles.brief}
        disabled={isDisabled}
        onChange={fields.handleUrlInput}
        onKeyDown={fields.handleEnter}
        placeholder={copy.importUrlPlaceholder}
        spellCheck={false}
        type="url"
        value={fields.url}
      />
      <label
        className={styles.pick}
        data-disabled={isDisabled}
        data-tip={copy.importImageTip}
      >
        <Icon name="image" size={IMAGE_ICON_SIZE} />
        <input
          accept={copy.importImageType}
          aria-label={copy.importImageLabel}
          className={styles.hiddenFile}
          disabled={isDisabled}
          onChange={fields.handleFile}
          type="file"
        />
      </label>
      <button
        className={styles.apply}
        data-tip={copy.importTip}
        disabled={isDisabled || fields.url.trim() === ""}
        onClick={fields.handleImport}
        type="button"
      >
        {importLabel}
      </button>
    </div>
  );
};

export { ThemeImportFields };
