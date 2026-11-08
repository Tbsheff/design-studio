import { useCallback } from "react";
import type { ReactElement } from "react";

import { COPY } from "./copy.js";
import { DesignMdField } from "./nds-design-md-field.js";
import { FolderField } from "./nds-folder-field.js";
import { TokensField } from "./nds-tokens-field.js";
import type { DraftForm, Patch } from "./new-design-system-values.js";

const toDesignMdFile = (
  designMd: string,
  file: string | null
): string | null => {
  if (designMd.trim()) {
    return file;
  }

  return null;
};

const AdvancedFields = ({
  form,
  set,
}: {
  form: DraftForm;
  set: (patch: Patch) => void;
}): ReactElement => {
  const { designMdFile } = form;

  const setTokens = useCallback(
    (tokensFile: File | null): void => set({ tokensFile }),
    [set]
  );

  const setFolder = useCallback(
    (folder: string): void => set({ folder }),
    [set]
  );

  const setDesignMd = useCallback(
    (designMd: string): void => {
      set({ designMd, designMdFile: toDesignMdFile(designMd, designMdFile) });
    },
    [designMdFile, set]
  );

  return (
    <div className="nds-advanced-body">
      <div className="nds-field">
        <span className="nds-field-label">{COPY.textTokensFile}</span>
        <span className="nds-field-hint">
          {COPY.textFigmaVariablesJsonWith}
        </span>
        <span className="nds-field-hint">{COPY.textFromFigmaExportThe}</span>
        <TokensField file={form.tokensFile} onChange={setTokens} />
      </div>
      <div className="nds-field">
        <span className="nds-field-label">{COPY.textCodeFolder}</span>
        <span className="nds-field-hint">{COPY.textReadOnlyTheStudio}</span>
        <FolderField value={form.folder} onChange={setFolder} />
      </div>
      <div className="nds-field">
        <span className="nds-field-label">{COPY.labelDesignMd}</span>
        <span className="nds-field-hint">{COPY.textPasteAnExistingDesign}</span>
        <DesignMdField value={form.designMd} onChange={setDesignMd} />
      </div>
    </div>
  );
};

export { AdvancedFields };
