import type { ReactElement, ReactNode } from "react";

import { ActivityItemBody } from "./activity-item-body.js";
import type { BadgeKind } from "./item-badge.js";

interface ActivityItemProps {
  readonly badge: BadgeKind;
  readonly children: ReactNode;
  readonly meta: string;
  readonly onClick: (() => void) | null;
  readonly title: string;
}

const ActivityItem = ({
  badge,
  children,
  meta,
  onClick,
  title,
}: ActivityItemProps): ReactElement => {
  if (onClick === null) {
    return (
      <div className="ide-item">
        <ActivityItemBody badge={badge} meta={meta} title={title}>
          {children}
        </ActivityItemBody>
      </div>
    );
  }

  return (
    <button type="button" className="ide-item" onClick={onClick}>
      <ActivityItemBody badge={badge} meta={meta} title={title}>
        {children}
      </ActivityItemBody>
    </button>
  );
};

export { ActivityItem };
