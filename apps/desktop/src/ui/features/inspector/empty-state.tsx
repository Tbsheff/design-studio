import { Icon } from "@design-studio/ui";

import { copy } from "./copy.js";
import { EMPTY_HINT } from "./inspector-model.js";

const EmptyState = ({
  reason,
  notice,
}: {
  readonly reason: string;
  readonly notice: string | null;
}) => (
  <div className="ins-empty">
    {notice ? (
      <div className="ins-error" role="alert">
        <Icon name="alert" size={14} />
        <span>{notice}</span>
      </div>
    ) : null}
    {reason === EMPTY_HINT ? (
      <div className="ins-empty-card">
        <span className="ins-empty-icon" aria-hidden="true">
          <Icon name="pointer" size={16} />
        </span>
        <p className="ins-empty-title">{copy.selectTitle}</p>
        <p className="ins-empty-text">{copy.selectText}</p>
      </div>
    ) : (
      <p className="ins-hint">{reason}</p>
    )}
  </div>
);

export { EmptyState };
