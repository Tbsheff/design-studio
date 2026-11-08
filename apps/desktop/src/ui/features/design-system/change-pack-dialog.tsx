import type { PackSummary } from "@design-studio/contracts";
import type { ReactElement } from "react";
import { useCallback } from "react";

import type { LibraryFrom } from "../../platform/storage.js";
import { ChangePackFoot } from "./change-pack-foot.js";
import { COPY } from "./copy.js";
import { PackDialogShell } from "./library-dialogs.js";
import { PackDialogError } from "./pack-dialog-error.js";
import { PackDialogHead } from "./pack-dialog-head.js";
import { PackList } from "./pack-list.js";
import { PackLoadError } from "./pack-load-error.js";
import { pickable, usePacks } from "./packs.js";
import { useBusyAction } from "./use-busy-action.js";

const toChangeTitle = (currentId: string | null): string => {
  if (currentId) {
    return "Change design system";
  }

  return "Add design system";
};

const ChangePackDialog = ({
  currentId,
  from,
  onApply,
  onClose,
}: {
  currentId: string | null;
  from: LibraryFrom | null;
  onApply: (packId: string) => Promise<void>;
  onClose: () => void;
}): ReactElement => {
  const state = pickable(usePacks());
  const action = useBusyAction(onClose);
  const title = toChangeTitle(currentId);
  const { isBusy, run } = action;

  const choose = useCallback(
    (pack: PackSummary | null): void => {
      if (!pack || isBusy) {
        return;
      }

      if (pack.id === currentId) {
        onClose();

        return;
      }

      run(() => onApply(pack.id));
    },
    [currentId, isBusy, onApply, onClose, run]
  );

  return (
    <PackDialogShell isBusy={isBusy} isWide label={title} onClose={onClose}>
      <PackDialogHead
        isBusy={isBusy}
        onClose={onClose}
        text={COPY.textWritesNewTokensTokens}
        title={title}
      />
      <div className="modal-body ds-switch-body" aria-busy={isBusy}>
        <PackLoadError error={state.error} />
        <PackDialogError error={action.error} />
        <PackList
          packs={state.packs}
          value={currentId}
          includeNone={false}
          onTab={null}
          onChoose={choose}
        />
      </div>
      <ChangePackFoot from={from} isBusy={isBusy} />
    </PackDialogShell>
  );
};

export { ChangePackDialog };
