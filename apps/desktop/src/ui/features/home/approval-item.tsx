import type { ReactElement } from "react";
import { useCallback } from "react";

import { ActivityItem } from "./activity-item.js";
import { toApprovalMeta } from "./activity-model.js";
import type { ActivityApprovalWire } from "./activity-model.js";
import { copy } from "./copy.js";

interface ApprovalItemProps {
  readonly approval: ActivityApprovalWire;
  readonly onOpen: (projectId: string) => void;
  readonly onSearch: () => void;
}

const ApprovalItem = ({
  approval,
  onOpen,
  onSearch,
}: ApprovalItemProps): ReactElement => {
  const handleOpen = useCallback((): void => {
    if (approval.projectId === null) {
      onSearch();

      return;
    }

    onOpen(approval.projectId);
  }, [approval.projectId, onOpen, onSearch]);

  return (
    <ActivityItem
      badge="approval"
      meta={toApprovalMeta(approval)}
      onClick={handleOpen}
      title={approval.title}
    >
      <span className="ide-item-link">{copy.review}</span>
    </ActivityItem>
  );
};

export { ApprovalItem };
