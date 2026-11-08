import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import type { CopyCodeItem } from "./use-copy-code-items.js";

const ITEM_ICON_SIZE = 14;

interface Props {
  readonly index: number;
  readonly item: CopyCodeItem;
  readonly onRegister: (index: number, node: HTMLButtonElement | null) => void;
}

const CopyCodeItemButton = ({
  index,
  item,
  onRegister,
}: Props): ReactElement => {
  const handleRef = useCallback(
    (node: HTMLButtonElement | null): void => {
      onRegister(index, node);
    },
    [index, onRegister]
  );

  return (
    <button
      ref={handleRef}
      type="button"
      role="menuitem"
      tabIndex={-1}
      onClick={item.handleSelect}
    >
      <Icon name={item.icon} size={ITEM_ICON_SIZE} />
      <span>{item.label}</span>
    </button>
  );
};

export { CopyCodeItemButton };
