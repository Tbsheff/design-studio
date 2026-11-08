import type { PackSummary } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { COPY } from "./copy.js";
import { PackDialogShell } from "./library-dialogs.js";
import { RenamePackForm } from "./rename-pack-form.js";
import { useBusyAction } from "./use-busy-action.js";

const RenamePackDialog = ({
  onClose,
  onRename,
  pack,
}: {
  onClose: () => void;
  onRename: (name: string) => Promise<void>;
  pack: PackSummary;
}): ReactElement => {
  const action = useBusyAction(onClose);

  return (
    <PackDialogShell
      isBusy={action.isBusy}
      label={COPY.labelRenameDesignSystem}
      onClose={onClose}
    >
      <RenamePackForm
        action={action}
        onClose={onClose}
        onRename={onRename}
        pack={pack}
      />
    </PackDialogShell>
  );
};

export { RenamePackDialog };
