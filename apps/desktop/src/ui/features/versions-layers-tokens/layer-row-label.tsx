import type { LayerNode } from "@design-studio/contracts";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { LayerRenameInput } from "./layer-rename-input.js";
import { editableName } from "./layers-tree.js";

interface LayerRowLabelProps {
  readonly isEditing: boolean;
  readonly node: LayerNode;
  readonly onRenameDone: (
    node: LayerNode,
    value: string | null,
    next?: 1 | -1
  ) => void;
}

const LayerRowLabel = ({
  isEditing,
  node,
  onRenameDone,
}: LayerRowLabelProps): ReactNode => {
  const handleDone = useCallback(
    (value: string | null, next?: 1 | -1): void => {
      onRenameDone(node, value, next);
    },
    [node, onRenameDone]
  );

  if (isEditing) {
    return (
      <LayerRenameInput initial={editableName(node.name)} onDone={handleDone} />
    );
  }

  return (
    <>
      {node.name && <span className="layers-name">{node.name}</span>}
      {node.text && <span className="layers-text">{node.text}</span>}
    </>
  );
};

export { LayerRowLabel };
