import type { ReactElement, ReactNode } from "react";
import { useCallback } from "react";

import { TreeBranch } from "./tree-branch.js";

interface WorkspaceGroupProps {
  readonly children: ReactNode;
  readonly count: number | null;
  readonly groupKey: string;
  readonly isOpen: boolean;
  readonly label: string;
  readonly onToggle: (key: string) => void;
}

const toCount = (count: number | null): string | null => {
  if (count === null) {
    return null;
  }

  return String(count);
};

const WorkspaceGroup = ({
  children,
  count,
  groupKey,
  isOpen,
  label,
  onToggle,
}: WorkspaceGroupProps): ReactElement => {
  const handleToggle = useCallback((): void => {
    onToggle(groupKey);
  }, [groupKey, onToggle]);

  return (
    <>
      <TreeBranch
        depth={1}
        isExpanded={isOpen}
        isSelected={false}
        meta={toCount(count)}
        onClick={handleToggle}
      >
        {label}
      </TreeBranch>
      {isOpen && children}
    </>
  );
};

export { WorkspaceGroup };
