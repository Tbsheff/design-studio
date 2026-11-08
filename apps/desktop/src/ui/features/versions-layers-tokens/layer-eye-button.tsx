import { Icon } from "@design-studio/ui";
import type { LayerNode } from "@design-studio/contracts";
import { useCallback } from "react";
import type { MouseEvent, ReactNode, SyntheticEvent } from "react";

import { COPY } from "./copy.js";
import { ICON_SIZE } from "./layers-constants.js";

interface LayerEyeButtonProps {
  readonly node: LayerNode;
  readonly onToggleHidden: (node: LayerNode) => void;
}

const stopEvent = (event: SyntheticEvent): void => {
  event.stopPropagation();
};

const LayerEyeButton = ({
  node,
  onToggleHidden,
}: LayerEyeButtonProps): ReactNode => {
  let label: string = COPY.labelHide;
  let tip: string = COPY.tipHide;
  let icon: "eye" | "eyeOff" = "eye";

  if (node.hidden) {
    label = COPY.labelShow;
    tip = COPY.tipShow;
    icon = "eyeOff";
  }

  const handleToggleHidden = useCallback(
    (event: MouseEvent<HTMLButtonElement>): void => {
      event.stopPropagation();
      onToggleHidden(node);
    },
    [node, onToggleHidden]
  );

  return (
    <button
      type="button"
      className="layers-eye"
      tabIndex={-1}
      aria-label={label}
      aria-pressed={node.hidden}
      data-tip={tip}
      data-tip-align="end"
      onPointerDown={stopEvent}
      onDoubleClick={stopEvent}
      onClick={handleToggleHidden}
    >
      <Icon name={icon} size={ICON_SIZE} />
    </button>
  );
};

export { LayerEyeButton };
