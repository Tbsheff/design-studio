import type { ReactElement } from "react";

import { copy } from "./copy.js";

interface Props {
  importFrom: readonly string[];
  isImportable: boolean;
  onImport: () => void;
}

const RulesEditorHead = ({
  importFrom,
  isImportable,
  onImport,
}: Props): ReactElement => (
  <div className="rules-head">
    <h3>{copy.designRules}</h3>
    {isImportable && (
      <button
        type="button"
        className="btn small ghost"
        data-tip={`Add the rules found in ${importFrom.join(", ")}. Check them, then save.`}
        data-tip-align="end"
        onClick={onImport}
      >
        {copy.importFromDocs}
      </button>
    )}
  </div>
);

export { RulesEditorHead };
