import type { ReactElement } from "react";

import { pick } from "../../platform/pick.js";
import { copy } from "./copy.js";

interface Props {
  isDirty: boolean;
  isEmpty: boolean;
  isSaving: boolean;
  isTesting: boolean;
  note: string | null;
  onSave: () => void;
  onTest: () => void;
}

const RulesEditorActions = ({
  isDirty,
  isEmpty,
  isSaving,
  isTesting,
  note,
  onSave,
  onTest,
}: Props): ReactElement => {
  const isBusy = isSaving || isTesting;

  return (
    <div className="pane-system-actions">
      <button
        type="button"
        className="btn small"
        disabled={isBusy || isEmpty}
        data-tip={copy.checkTheseRules}
        onClick={onTest}
      >
        {pick(isTesting, "Testing…", "Test on frame")}
      </button>
      <button
        type="button"
        className="btn small primary"
        disabled={isBusy || !isDirty}
        onClick={onSave}
      >
        {pick(isSaving, "Saving…", "Save")}
      </button>
      {note && <span className="pane-system-text">{note}</span>}
    </div>
  );
};

export { RulesEditorActions };
