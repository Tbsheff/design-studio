import { Icon } from "@design-studio/ui";
import { useCallback, useEffect, useRef } from "react";
import type { ReactElement } from "react";

import type { MenuEntry } from "./top-bar-menu-model.js";

interface MenuItemButtonProps {
  entry: MenuEntry;
  onClose: (refocus: boolean) => void;
  onRegister: (node: HTMLButtonElement) => () => void;
}

const MenuItemButton = ({
  entry,
  onClose,
  onRegister,
}: MenuItemButtonProps): ReactElement => {
  const checked = entry.checked ?? null;
  let role: "menuitem" | "menuitemradio" = "menuitemradio";

  if (checked === null) {
    role = "menuitem";
  }

  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const node = ref.current;

    if (!node) {
      return;
    }

    return onRegister(node);
  }, [onRegister]);

  const run = useCallback(() => {
    onClose(true);
    entry.run();
  }, [entry, onClose]);

  return (
    <button
      ref={ref}
      type="button"
      role={role}
      aria-checked={entry.checked}
      className="ui-menu-item"
      disabled={entry.disabled}
      data-tip={entry.tip}
      data-tip-align="start"
      onClick={run}
    >
      {entry.icon && <Icon name={entry.icon} size={14} />}
      <span className="truncate">{entry.label}</span>
      {entry.meta && <span className="ui-menu-meta">{entry.meta}</span>}
    </button>
  );
};

export { MenuItemButton };
