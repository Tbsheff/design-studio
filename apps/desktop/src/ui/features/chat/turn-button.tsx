import { Icon } from "@design-studio/ui";
import type { IconName } from "@design-studio/ui";
import { useCallback } from "react";
import type { MouseEvent, ReactElement } from "react";

const TURN_ICON_SIZE = 14;

const TurnButton = ({
  label,
  icon,
  tip,
  onClick,
}: {
  label: string;
  icon: IconName;
  tip: string | null;
  onClick: () => void;
}): ReactElement | null => {
  const activate = useCallback(
    (event: MouseEvent<HTMLButtonElement>): void => {
      event.stopPropagation();
      onClick();
    },
    [onClick]
  );

  if (tip !== null) {
    return null;
  }

  return (
    <button
      type="button"
      className="icon-btn small msg-action"
      aria-label={label}
      data-tip={label}
      data-tip-side="top"
      onClick={activate}
    >
      <Icon name={icon} size={TURN_ICON_SIZE} />
    </button>
  );
};

export { TurnButton };
