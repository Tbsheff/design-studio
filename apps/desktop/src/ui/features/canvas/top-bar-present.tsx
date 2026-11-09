import { useCallback } from "react";
import type { ReactElement } from "react";

import { tipWithKey } from "../../canvas-toolbar-slots.js";
import { copy } from "./copy.js";
import { DropMenu } from "./top-bar-drop.js";
import type { MenuEntry, MenuGroup } from "./top-bar-menu-model.js";

const TopBarPresent = ({ present }: { present: MenuEntry[] }): ReactElement => {
  const groups = useCallback(
    (): MenuGroup[] => [{ items: present }],
    [present]
  );

  return (
    <DropMenu
      label={copy.present}
      triggerClass="topbar-text-btn topbar-present"
      groups={groups}
      align="end"
      tip={tipWithKey(copy.present, "present")}
    >
      <span className="topbar-label">{copy.present}</span>
    </DropMenu>
  );
};

export { TopBarPresent };
