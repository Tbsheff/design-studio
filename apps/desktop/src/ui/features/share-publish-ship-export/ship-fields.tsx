import type { ShipMode, ShipPrepare } from "@design-studio/contracts/ship";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { ShipInputField } from "./ship-input-field.js";
import { ShipModePicker } from "./ship-mode-picker.js";
import type { Draft, Fields } from "./ship-model.js";
import { ShipPrFields } from "./ship-pr-fields.js";
import { ShipTextareaField } from "./ship-textarea-field.js";

interface ShipFieldsProps {
  readonly plan: ShipPrepare;
  readonly draft: Draft;
  readonly fields: Fields;
  readonly onPatch: (next: Partial<Draft>) => void;
}

const COMMIT_ROWS = 3;

const ShipFields = ({
  draft,
  fields,
  onPatch,
  plan,
}: ShipFieldsProps): ReactElement => {
  const setIssue = useCallback(
    (issue: string): void => {
      onPatch({ issue });
    },
    [onPatch]
  );

  const setBranch = useCallback(
    (branch: string): void => {
      onPatch({ branch });
    },
    [onPatch]
  );

  const setCommitMessage = useCallback(
    (commitMessage: string): void => {
      onPatch({ commitMessage });
    },
    [onPatch]
  );

  const setMode = useCallback(
    (mode: ShipMode): void => {
      onPatch({ mode });
    },
    [onPatch]
  );

  return (
    <div className="ship-fields">
      <ShipInputField
        label={copy.issueId}
        value={draft.issue}
        onValue={setIssue}
        isMono
        placeholder={copy.qa1234}
        isWide={false}
      />
      <ShipInputField
        label={copy.branch}
        value={fields.branch}
        onValue={setBranch}
        isMono
        placeholder={null}
        isWide={false}
      />
      <ShipTextareaField
        label={copy.commitMessage}
        value={fields.commitMessage}
        rows={COMMIT_ROWS}
        onValue={setCommitMessage}
      />
      <ShipModePicker plan={plan} mode={draft.mode} onMode={setMode} />
      {draft.mode === "pr" && (
        <ShipPrFields fields={fields} onPatch={onPatch} />
      )}
    </div>
  );
};

export { ShipFields };
