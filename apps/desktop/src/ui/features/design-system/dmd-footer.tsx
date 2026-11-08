import type { ReactElement } from "react";
import { useCallback } from "react";

import { DmdFoot } from "./dmd-foot.js";
import { DmdUnsavedBar } from "./dmd-unsaved-bar.js";
import type { DesignMd } from "./use-design-md.js";

const DmdFooter = ({
  md,
  modKey,
  onClose,
}: {
  md: DesignMd;
  modKey: string;
  onClose: () => void;
}): ReactElement => {
  const { keepEditing, requestClose, save } = md;

  const cancel = useCallback((): void => {
    requestClose();
  }, [requestClose]);

  if (md.isAsking) {
    return (
      <DmdUnsavedBar
        isSaving={md.isSaving}
        onSave={save}
        onDiscard={onClose}
        onKeep={keepEditing}
      />
    );
  }

  return (
    <DmdFoot
      canSave={md.content !== null && md.isDirty}
      isSaving={md.isSaving}
      modKey={modKey}
      onCancel={cancel}
      onSave={save}
    />
  );
};

export { DmdFooter };
