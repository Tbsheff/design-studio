import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";
import { useEffect, useRef } from "react";

import { ROLES } from "./aria-roles.js";
import { COPY } from "./copy.js";
import { toSaveLabel } from "./design-md-model.js";

const DmdUnsavedBar = ({
  isSaving,
  onDiscard,
  onKeep,
  onSave,
}: {
  isSaving: boolean;
  onDiscard: () => void;
  onKeep: () => void;
  onSave: () => void;
}): ReactElement => {
  const keep = useRef<HTMLButtonElement>(null);

  useEffect(() => keep.current?.focus(), []);

  return (
    <div
      className="modal-foot dmd-unsaved"
      role={ROLES.alertdialog}
      aria-label={COPY.labelUnsavedChanges}
      aria-describedby="dmd-unsaved-text"
    >
      <span id="dmd-unsaved-text" className="dmd-unsaved-text">
        <Icon name="alert" size={14} />
        {COPY.textSaveYourChangesTo}
      </span>
      <button
        type="button"
        className="btn ghost"
        onClick={onDiscard}
        disabled={isSaving}
      >
        {COPY.textDiscard}
      </button>
      <button
        ref={keep}
        type="button"
        className="btn ghost"
        onClick={onKeep}
        disabled={isSaving}
      >
        {COPY.textKeepEditing}
      </button>
      <button
        type="button"
        className="btn primary"
        onClick={onSave}
        disabled={isSaving}
      >
        {toSaveLabel(isSaving)}
      </button>
    </div>
  );
};

export { DmdUnsavedBar };
