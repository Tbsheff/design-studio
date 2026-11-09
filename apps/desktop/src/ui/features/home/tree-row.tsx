import type { ReactElement, ReactNode } from "react";

import { toDataFlag } from "./data-flag-model.js";
import { Star } from "./star-icon.js";

interface TreeRowProps {
  readonly children: ReactNode;
  readonly depth: 0 | 1 | 2;
  readonly isPinned: boolean;
  readonly isSelected: boolean;
  readonly meta: string | null;
  readonly onClick: () => void;
}

const STAR_SIZE = 12;

const TreeRow = ({
  children,
  depth,
  isPinned,
  isSelected,
  meta,
  onClick,
}: TreeRowProps): ReactElement => (
  <button
    type="button"
    className="ide-row"
    data-depth={depth}
    data-on={toDataFlag(isSelected)}
    onClick={onClick}
  >
    <span className="ide-row-lead" aria-hidden="true">
      {isPinned && <Star isFilled size={STAR_SIZE} />}
    </span>
    <span className="ide-row-label">{children}</span>
    {meta !== null && <span className="ide-row-meta">{meta}</span>}
  </button>
);

export { TreeRow };
