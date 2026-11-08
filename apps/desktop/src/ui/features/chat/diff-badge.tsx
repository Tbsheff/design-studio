import type { ReactElement } from "react";

import { copy } from "./copy.js";

const DiffBadge = ({
  added,
  removed,
}: {
  added: number;
  removed: number;
}): ReactElement => (
  <span className="diff-badge tabular-nums">
    <span className="sr-only">{`${added} lines added, ${removed} removed`}</span>
    {(added > 0 || removed === 0) && (
      <span className="diff-plus" aria-hidden="true">
        {copy.text13}
        {added}
      </span>
    )}
    {removed > 0 && (
      <span className="diff-minus" aria-hidden="true">
        {copy.text14}
        {removed}
      </span>
    )}
  </span>
);

export { DiffBadge };
