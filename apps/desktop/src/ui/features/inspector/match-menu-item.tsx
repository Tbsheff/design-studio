import { Icon } from "@design-studio/ui";
import type { ReactElement, ReactNode, RefObject } from "react";
import { useCallback } from "react";

const MatchMenuItem = ({
  icon,
  itemRef,
  onRun,
  children,
}: {
  readonly icon: "pointer" | "code" | "token";
  readonly itemRef: RefObject<HTMLButtonElement | null> | null;
  readonly onRun: () => void;
  readonly children: ReactNode;
}): ReactElement => {
  const run = useCallback(() => onRun(), [onRun]);

  return (
    <button
      ref={itemRef}
      type="button"
      role="menuitem"
      tabIndex={-1}
      className="ui-menu-item"
      onClick={run}
    >
      <Icon name={icon} size={14} />
      {children}
    </button>
  );
};

export { MatchMenuItem };
