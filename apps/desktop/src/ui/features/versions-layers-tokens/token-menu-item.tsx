import { Icon } from "@design-studio/ui";
import type { IconName } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactNode } from "react";

import styles from "./token-rename.module.css";

const MENU_ICON_SIZE = 14;

interface TokenMenuItemProps {
  readonly block: string | null;
  readonly icon: IconName;
  readonly label: string;
  readonly onPick: () => void;
  readonly testId: string;
}

const TokenMenuItem = ({
  block,
  icon,
  label,
  onPick,
  testId,
}: TokenMenuItemProps): ReactNode => {
  const handlePick = useCallback((): void => {
    if (block === null) {
      onPick();
    }
  }, [block, onPick]);

  return (
    <button
      type="button"
      role="menuitem"
      className={`ui-menu-item ${styles.item}`}
      tabIndex={-1}
      aria-disabled={block !== null}
      data-tip={block}
      data-testid={testId}
      onClick={handlePick}
    >
      <Icon name={icon} size={MENU_ICON_SIZE} />
      <span>{label}</span>
    </button>
  );
};

export { TokenMenuItem };
