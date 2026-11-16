import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { tipWithKey } from "../../canvas-toolbar-slots.js";
import { copy, presentCopy } from "./copy.js";
import { DropMenu } from "./top-bar-drop.js";
import type { MenuEntry, MenuGroup } from "./top-bar-menu-model.js";

interface TopBarPresentProps {
  readonly onPresent: () => void;
  readonly present: MenuEntry[];
}

const CHEVRON = <Icon name="chevronDown" size={12} />;

const TopBarPresent = ({
  onPresent,
  present,
}: TopBarPresentProps): ReactElement => {
  const groups = useCallback(
    (): MenuGroup[] => [{ items: present }],
    [present]
  );

  return (
    <span className="topbar-present-split">
      <button
        type="button"
        className="topbar-text-btn topbar-present"
        data-tip={tipWithKey(presentCopy.windowTip, "present")}
        onClick={onPresent}
      >
        <span className="topbar-label">{copy.present}</span>
      </button>
      <DropMenu
        label={presentCopy.more}
        triggerClass="topbar-text-btn topbar-present-more"
        groups={groups}
        align="end"
        tip={presentCopy.more}
      >
        {CHEVRON}
      </DropMenu>
    </span>
  );
};

export { TopBarPresent };
