import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { tipWithKey } from "../../canvas-toolbar-slots.js";
import { copy, presentCopy } from "./copy.js";
import { DropMenu } from "./top-bar-drop.js";
import type { MenuEntry, MenuGroup } from "./top-bar-menu-model.js";

interface TopBarPresentProps {
  readonly canPlay: boolean;
  readonly onPlay: () => void;
  readonly present: MenuEntry[];
}

const CHEVRON = <Icon name="chevronDown" size={12} />;

const toMainId = (canPlay: boolean): string => {
  if (canPlay) {
    return "play";
  }

  return "window";
};

const toMainTip = (canPlay: boolean): string => {
  if (canPlay) {
    return presentCopy.playTip;
  }

  return tipWithKey(presentCopy.windowTip, "present");
};

const TopBarPresent = ({
  canPlay,
  onPlay,
  present,
}: TopBarPresentProps): ReactElement => {
  const mainId = toMainId(canPlay);

  const groups = useCallback(
    (): MenuGroup[] => [
      { items: present.filter((entry) => entry.id !== mainId) },
    ],
    [present, mainId]
  );

  const handlePresent = useCallback((): void => {
    if (canPlay) {
      onPlay();

      return;
    }

    present.find((entry) => entry.id === mainId)?.run();
  }, [canPlay, onPlay, present, mainId]);

  return (
    <span className="topbar-present-split">
      <button
        type="button"
        className="topbar-text-btn topbar-present"
        data-tip={toMainTip(canPlay)}
        onClick={handlePresent}
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
