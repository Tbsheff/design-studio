import type { LayerNode } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { MouseEvent, ReactNode, SyntheticEvent } from "react";

import { COPY } from "./copy.js";
import { ICON_SIZE } from "./layers-constants.js";

interface LayerLockButtonProps {
  readonly node: LayerNode;
  readonly onToggle: (node: LayerNode) => void;
}

const stopEvent = (event: SyntheticEvent): void => {
  event.stopPropagation();
};

const LayerLockButton = ({
  node,
  onToggle,
}: LayerLockButtonProps): ReactNode => {
  const isLocked = node.locked === true;
  let label: string = COPY.labelLock;
  let tip: string = COPY.tipLock;
  let icon: "lock" | "unlock" = "unlock";

  if (isLocked) {
    label = COPY.labelUnlock;
    tip = COPY.tipUnlock;
    icon = "lock";
  }

  const handleToggleLocked = useCallback(
    (event: MouseEvent<HTMLButtonElement>): void => {
      event.stopPropagation();
      onToggle(node);
    },
    [node, onToggle]
  );

  return (
    <button
      type="button"
      className="layers-eye layers-lock"
      tabIndex={-1}
      aria-label={label}
      aria-pressed={isLocked}
      data-tip={tip}
      data-tip-align="end"
      onPointerDown={stopEvent}
      onDoubleClick={stopEvent}
      onClick={handleToggleLocked}
    >
      <Icon name={icon} size={ICON_SIZE} />
    </button>
  );
};

export { LayerLockButton };
