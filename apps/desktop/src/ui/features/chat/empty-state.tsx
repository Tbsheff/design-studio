import { Icon } from "@design-studio/ui";
import type { ReactNode } from "react";

import { copy } from "./copy.js";

const EmptyState = ({
  lead,
  empty,
}: {
  lead: ReactNode;
  empty: boolean;
}): ReactNode => {
  const shownLead = lead ?? null;

  if (shownLead !== null) {
    return shownLead;
  }

  if (!empty) {
    return null;
  }

  return (
    <div className="chat-empty">
      <span className="chat-empty-icon">
        <Icon name="sparkle" size={18} />
      </span>
      <strong>{copy.describeAChange}</strong>
      <p>{copy.orClickALayer}</p>
    </div>
  );
};

export { EmptyState };
