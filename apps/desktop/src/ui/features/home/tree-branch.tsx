import { Icon } from "@design-studio/ui";
import type { ReactElement, ReactNode } from "react";

import { toDataFlag } from "./data-flag-model.js";

interface TreeBranchProps {
  readonly children: ReactNode;
  readonly depth: 0 | 1;
  readonly isExpanded: boolean;
  readonly isSelected: boolean;
  readonly meta: string | null;
  readonly onClick: () => void;
}

const CARET_SIZE = 12;

const TreeBranch = ({
  children,
  depth,
  isExpanded,
  isSelected,
  meta,
  onClick,
}: TreeBranchProps): ReactElement => (
  <button
    type="button"
    className="ide-row ide-branch"
    data-depth={depth}
    data-on={toDataFlag(isSelected)}
    aria-expanded={isExpanded}
    onClick={onClick}
  >
    <span className="ide-row-lead ide-caret" aria-hidden="true">
      <Icon name="chevronRight" size={CARET_SIZE} />
    </span>
    <span className="ide-row-label">{children}</span>
    {meta !== null && <span className="ide-row-meta">{meta}</span>}
  </button>
);

export { TreeBranch };
