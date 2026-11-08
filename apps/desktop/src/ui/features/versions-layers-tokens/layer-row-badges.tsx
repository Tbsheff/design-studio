import type { LayerNode } from "@design-studio/contracts";
import type { ReactNode } from "react";

import { COPY } from "./copy.js";
import { LayerEyeButton } from "./layer-eye-button.js";
import { LayerLockButton } from "./layer-lock-button.js";

interface LayerRowBadgesProps {
  readonly isEditable: boolean;
  readonly isEditing: boolean;
  readonly node: LayerNode;
  readonly onToggleHidden: (node: LayerNode) => void;
  readonly onToggleLocked: ((node: LayerNode) => void) | null;
}

const LayerRowBadges = ({
  isEditable,
  isEditing,
  node,
  onToggleHidden,
  onToggleLocked,
}: LayerRowBadgesProps): ReactNode => {
  const isEyeShown = isEditable && !isEditing;

  return (
    <>
      {onToggleLocked && !isEditing && (
        <LayerLockButton node={node} onToggle={onToggleLocked} />
      )}
      {isEyeShown && (
        <LayerEyeButton node={node} onToggleHidden={onToggleHidden} />
      )}
      {!isEyeShown && node.hidden && (
        <span className="layers-flag">{COPY.layersHidden}</span>
      )}
    </>
  );
};

export { LayerRowBadges };
