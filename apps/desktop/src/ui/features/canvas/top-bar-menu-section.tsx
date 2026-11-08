import type { ReactElement } from "react";

import { MenuItemButton } from "./top-bar-menu-item.js";
import type { MenuGroup } from "./top-bar-menu-model.js";

interface MenuSectionProps {
  group: MenuGroup;
  onClose: (refocus: boolean) => void;
  onRegister: (node: HTMLButtonElement) => () => void;
}

const MenuSection = ({
  group,
  onClose,
  onRegister,
}: MenuSectionProps): ReactElement => (
  <div className="ui-menu-section" data-fold={group.fold}>
    {group.label && <div className="ui-menu-label">{group.label}</div>}
    {group.items.map((entry) => (
      <MenuItemButton
        key={entry.id}
        entry={entry}
        onClose={onClose}
        onRegister={onRegister}
      />
    ))}
    {group.note && <p className="ui-menu-note">{group.note}</p>}
  </div>
);

export { MenuSection };
