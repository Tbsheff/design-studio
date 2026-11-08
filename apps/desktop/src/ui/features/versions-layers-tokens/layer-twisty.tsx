import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { PointerEvent, ReactNode } from "react";

import { TWISTY_ICON_SIZE } from "./layers-constants.js";

interface LayerTwistyProps {
  readonly id: number;
  readonly isCollapsed: boolean;
  readonly isLeaf: boolean;
  readonly onToggle: (id: number) => void;
}

const LayerTwisty = ({
  id,
  isCollapsed,
  isLeaf,
  onToggle,
}: LayerTwistyProps): ReactNode => {
  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLSpanElement>): void => {
      event.preventDefault();
      event.stopPropagation();
      onToggle(id);
    },
    [id, onToggle]
  );

  if (isLeaf) {
    return <span className="layers-twisty" aria-hidden="true" />;
  }

  let className = "layers-twisty open";

  if (isCollapsed) {
    className = "layers-twisty";
  }

  return (
    <span
      className={className}
      aria-hidden="true"
      onPointerDown={handlePointerDown}
    >
      <Icon name="chevronRight" size={TWISTY_ICON_SIZE} />
    </span>
  );
};

export { LayerTwisty };
