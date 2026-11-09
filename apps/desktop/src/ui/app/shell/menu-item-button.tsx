import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import type { MenuItem } from "./pane-menu-model";

interface MenuItemButtonProps {
  readonly item: MenuItem;
  readonly onDone: () => void;
}

const MenuItemButton = ({
  item,
  onDone,
}: MenuItemButtonProps): ReactElement => {
  const runItem = useCallback((): void => {
    onDone();
    item.run();
  }, [item, onDone]);

  if (item.checked === null) {
    return (
      <button
        type="button"
        role="menuitem"
        className="ui-menu-item"
        data-item={item.id}
        onClick={runItem}
      >
        <Icon name={item.icon} size={14} />
        <span>{item.label}</span>
        {item.meta && <span className="ui-menu-meta">{item.meta}</span>}
      </button>
    );
  }

  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={item.checked}
      className="ui-menu-item"
      onClick={runItem}
    >
      <Icon name={item.icon} size={14} />
      <span>{item.label}</span>
    </button>
  );
};

export { MenuItemButton };
