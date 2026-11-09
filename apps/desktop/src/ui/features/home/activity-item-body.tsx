import type { ReactElement, ReactNode } from "react";

import { ItemBadge } from "./item-badge.js";
import type { BadgeKind } from "./item-badge.js";

interface ActivityItemBodyProps {
  readonly badge: BadgeKind;
  readonly children: ReactNode;
  readonly meta: string;
  readonly title: string;
}

const ActivityItemBody = ({
  badge,
  children,
  meta,
  title,
}: ActivityItemBodyProps): ReactElement => (
  <>
    <span className="ide-item-lead" aria-hidden="true">
      <ItemBadge kind={badge} />
    </span>
    <span className="ide-item-title">{title}</span>
    <span className="ide-item-end">{children}</span>
    <span className="ide-item-meta">{meta}</span>
  </>
);

export { ActivityItemBody };
