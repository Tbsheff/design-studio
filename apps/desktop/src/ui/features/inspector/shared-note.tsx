import type { ReactElement } from "react";

import { SharedSourceNote } from "./shared-source-note.js";
import type { SharedEditing } from "./simple-model.js";

interface SharedNoteProps {
  readonly sharedEditing: SharedEditing | null;
  readonly isForwards: boolean;
}

const SharedNote = ({
  sharedEditing,
  isForwards,
}: SharedNoteProps): ReactElement | null => {
  if (!sharedEditing) {
    return null;
  }

  const { shared, isEditingUse, onToggle } = sharedEditing;

  return (
    <SharedSourceNote
      shared={shared}
      isEditingUse={isEditingUse}
      canUse={isEditingUse || isForwards}
      onToggle={onToggle}
    />
  );
};

export { SharedNote };
