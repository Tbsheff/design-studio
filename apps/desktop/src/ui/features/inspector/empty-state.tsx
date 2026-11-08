import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { EmptyCard } from "./empty-card.js";
import { EMPTY_HINT } from "./inspector-model.js";

const EmptyState = ({
  reason,
  notice,
}: {
  readonly reason: string;
  readonly notice: string | null;
}): ReactElement => (
  <div className="ins-empty">
    {notice && (
      <div className="ins-error" role="alert">
        <Icon name="alert" size={14} />
        <span>{notice}</span>
      </div>
    )}
    {reason === EMPTY_HINT && <EmptyCard />}
    {reason !== EMPTY_HINT && <p className="ins-hint">{reason}</p>}
  </div>
);

export { EmptyState };
