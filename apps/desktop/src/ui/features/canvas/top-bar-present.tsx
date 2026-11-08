import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { DropMenu } from "./top-bar-drop-menu.js";
import type { MenuEntry, MenuGroup } from "./top-bar-menu.js";

const TopBarPresent = ({ present }: { present: MenuEntry[] }): ReactElement => {
  const groups = useCallback(
    (): MenuGroup[] => [{ items: present }],
    [present]
  );

  return (
    <DropMenu
      label="Present"
      triggerClass="btn ghost topbar-present"
      anchorClass="topbar-fold-wide"
      groups={groups}
      align="end"
      tip="Present"
    >
      <Icon name="play" size={14} />
      <span className="topbar-label">{copy.present}</span>
      <Icon name="chevronDown" size={12} />
    </DropMenu>
  );
};

export { TopBarPresent };
