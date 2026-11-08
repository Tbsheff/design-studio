import type { ReactElement } from "react";

import { TurnButton } from "./turn-button.js";

const TurnTools = ({
  editTip,
  restoreTip,
  onEdit,
  onRename,
  onRestore,
}: {
  editTip: string | null;
  restoreTip: string | null;
  onEdit: () => void;
  onRename: () => void;
  onRestore: () => void;
}): ReactElement => (
  <span className="msg-actions" data-testid="message-actions">
    <TurnButton
      label="Restore code here"
      icon="restore"
      tip={restoreTip}
      onClick={onRestore}
    />
    <TurnButton
      label="Edit and rerun"
      icon="branch"
      tip={editTip}
      onClick={onEdit}
    />
    <TurnButton label="Rename" icon="pencil" tip={null} onClick={onRename} />
  </span>
);

export { TurnTools };
