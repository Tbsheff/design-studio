import type { ReactElement } from "react";

import { COPY } from "./copy.js";
import { PackDialogShell } from "./library-dialogs.js";
import { SavePackForm } from "./save-pack-form.js";
import { useBusyAction } from "./use-busy-action.js";

const SavePackDialog = ({
  canCopy,
  defaultName,
  onClose,
  onSave,
  updating,
}: {
  canCopy: boolean;
  defaultName: string;
  onClose: () => void;
  onSave: (name: string, asNew: boolean) => Promise<void>;
  updating: boolean;
}): ReactElement => {
  const action = useBusyAction(onClose);

  return (
    <PackDialogShell
      isBusy={action.isBusy}
      isWide={false}
      label={COPY.labelSaveToLibrary}
      onClose={onClose}
    >
      <SavePackForm
        action={action}
        canCopy={canCopy}
        defaultName={defaultName}
        isUpdating={updating}
        onClose={onClose}
        onSave={onSave}
      />
    </PackDialogShell>
  );
};

export { SavePackDialog };
