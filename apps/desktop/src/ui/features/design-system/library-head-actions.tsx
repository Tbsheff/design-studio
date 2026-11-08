import { Icon } from "@design-studio/ui";
import type { ChangeEvent, ReactElement, RefObject } from "react";
import { useCallback } from "react";

import { COPY } from "./copy.js";
import { toImportLabel } from "./library-model.js";

const LibraryHeadActions = ({
  fileInput,
  isImporting,
  onFile,
  onNew,
}: {
  fileInput: RefObject<HTMLInputElement | null>;
  isImporting: boolean;
  onFile: (file: File) => void;
  onNew: () => void;
}): ReactElement => {
  const pickFile = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      const file = event.target.files?.[0];

      event.target.value = "";

      if (file) {
        onFile(file);
      }
    },
    [onFile]
  );

  const openPicker = useCallback(() => fileInput.current?.click(), [fileInput]);

  return (
    <div className="lib-head-actions">
      <input
        ref={fileInput}
        type="file"
        accept=".zip,application/zip"
        className="sr-only"
        tabIndex={-1}
        aria-label={COPY.labelDesignSystemZip}
        onChange={pickFile}
      />
      <button
        type="button"
        className="btn"
        disabled={isImporting}
        onClick={openPicker}
      >
        {toImportLabel(isImporting)}
      </button>
      <button type="button" className="btn primary has-icon" onClick={onNew}>
        <Icon name="plus" size={14} />
        {COPY.textNewDesignSystem}
      </button>
    </div>
  );
};

export { LibraryHeadActions };
