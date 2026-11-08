import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { MouseEvent, ReactNode } from "react";

import { toMenuItemClass } from "./version-menu-model.js";
import { toMenuTestId } from "./version-row-model.js";
import type { MoreItem } from "./version-row-types.js";

const MENU_ICON_SIZE = 14;

interface VersionMenuItemProps {
  readonly item: MoreItem;
  readonly onPick: (refocus: boolean) => void;
}

const VersionMenuItem = ({ item, onPick }: VersionMenuItemProps): ReactNode => {
  const handleRunItem = useCallback(
    (event: MouseEvent<HTMLButtonElement>): void => {
      onPick(event.detail === 0);
      item.run();
    },
    [item, onPick]
  );

  return (
    <button
      type="button"
      role="menuitem"
      className={toMenuItemClass(item.hint)}
      tabIndex={-1}
      disabled={Boolean(item.hint)}
      data-testid={toMenuTestId(item.id)}
      onClick={handleRunItem}
    >
      <Icon name={item.icon} size={MENU_ICON_SIZE} />
      <span>{item.label}</span>
      {item.hint && <span className="ui-menu-hint">{item.hint}</span>}
    </button>
  );
};

export { VersionMenuItem };
