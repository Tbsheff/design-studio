import type { ReactElement } from "react";

import type { ChipDialog } from "./chip-model.js";
import { ChangePackDialog, SavePackDialog } from "./design-system-dialogs.js";
import type { DesignSystemActions } from "./design-system-model.js";
import type { DesignSystemRef } from "./design-system-ref.js";

const toSource = (
  system: DesignSystemRef
): { directionId: string; projectId: string } | null => {
  if (!system.directionId) {
    return null;
  }

  return { directionId: system.directionId, projectId: system.projectId };
};

const ChipDialogs = ({
  actions,
  dialog,
  isUserPack,
  name,
  onClose,
  system,
}: {
  actions: DesignSystemActions;
  dialog: ChipDialog;
  isUserPack: boolean;
  name: string;
  onClose: () => void;
  system: DesignSystemRef;
}): ReactElement | null => {
  const { onApply: apply, onSaveNamed: save } = actions;

  if (dialog === "change") {
    return (
      <ChangePackDialog
        currentId={system.packId}
        from={toSource(system)}
        onClose={onClose}
        onApply={apply}
      />
    );
  }

  if (dialog === "save") {
    return (
      <SavePackDialog
        defaultName={name}
        updating={isUserPack}
        canCopy={isUserPack && !system.backing}
        onClose={onClose}
        onSave={save}
      />
    );
  }

  return null;
};

export { ChipDialogs };
