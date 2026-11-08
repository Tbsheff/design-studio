import type { ChangeEvent, ReactElement } from "react";
import { useCallback } from "react";

import { copy } from "./copy.js";
import type { CommentsControl } from "./use-comments.js";

const ResolvedFilter = ({
  control,
  hiddenCount,
}: {
  control: CommentsControl;
  hiddenCount: number;
}): ReactElement | null => {
  const { setShowResolved, showResolved } = control;

  const change = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      setShowResolved(event.target.checked);
    },
    [setShowResolved]
  );

  if (hiddenCount === 0) {
    return null;
  }

  return (
    <div className="comments-filter">
      <label>
        <input type="checkbox" checked={showResolved} onChange={change} />
        {copy.textShowResolved}
      </label>
      {!showResolved && (
        <span className="count" data-testid="resolved-hidden">
          {hiddenCount} {copy.textHidden}
        </span>
      )}
    </div>
  );
};

export { ResolvedFilter };
