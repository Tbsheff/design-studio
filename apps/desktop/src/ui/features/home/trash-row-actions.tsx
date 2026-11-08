import type { TrashItem } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import type { ReactElement, Ref } from "react";

import { copy } from "./copy.js";

const RESTORE_ICON_SIZE = 14;

interface TrashRowActionsProps {
  readonly item: TrashItem;
  readonly isBusy: boolean;
  readonly restoreRef: Ref<HTMLButtonElement> | null;
  readonly onRestore: () => void;
  readonly onDelete: () => void;
}

const TrashRowActions = ({
  item,
  isBusy,
  restoreRef,
  onRestore,
  onDelete,
}: TrashRowActionsProps): ReactElement => (
  <div className="trash-actions">
    <button
      ref={restoreRef}
      type="button"
      className="btn small has-icon"
      onClick={onRestore}
      disabled={isBusy}
      aria-label={`Restore ${item.name}`}
    >
      <Icon name="restore" size={RESTORE_ICON_SIZE} />
      {copy.restore}
    </button>
    <button
      type="button"
      className="btn small ghost danger"
      onClick={onDelete}
      disabled={isBusy}
      aria-label={`Delete ${item.name} forever`}
    >
      {copy.deleteForever}
    </button>
  </div>
);

export { TrashRowActions };
