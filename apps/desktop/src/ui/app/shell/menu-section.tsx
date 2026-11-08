import type { ReactElement } from "react";

import { MenuItemButton } from "./menu-item-button";
import type { MenuItem } from "./pane-menu-model";

interface MenuSectionProps {
  readonly items: MenuItem[];
  readonly label: string | null;
  readonly onDone: () => void;
}

const MenuSection = ({
  items,
  label,
  onDone,
}: MenuSectionProps): ReactElement => (
  <div className="ui-menu-section">
    {label && <div className="ui-menu-label">{label}</div>}
    {items.map((item) => (
      <MenuItemButton key={item.id} item={item} onDone={onDone} />
    ))}
  </div>
);

export { MenuSection };
