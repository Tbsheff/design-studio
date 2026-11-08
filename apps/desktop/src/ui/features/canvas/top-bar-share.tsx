import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { DropMenu } from "./top-bar-drop-menu.js";
import { shareGroups } from "./top-bar-menu.js";
import type { MenuGroup } from "./top-bar-menu.js";
import type { Props } from "./top-bar-props.js";

const toShareTip = (hasShip: boolean): string => {
  if (hasShip) {
    return "Export, or ship as a pull request";
  }

  return "Export images, files or a handoff";
};

const TopBarShare = ({
  props,
  onPort,
}: {
  props: Props;
  onPort: (() => void) | null;
}): ReactElement => {
  const { canExport, onExport, onShip, onShareLink } = props;

  const groups = useCallback(
    (): MenuGroup[] =>
      shareGroups({ canExport, onExport, onShareLink, onShip }, onPort),
    [canExport, onExport, onShareLink, onShip, onPort]
  );

  return (
    <DropMenu
      label="Share"
      triggerClass="btn strong topbar-share"
      groups={groups}
      align="end"
      tip={toShareTip(Boolean(onShip))}
    >
      <Icon name="share" size={14} />
      <span className="topbar-label">{copy.share}</span>
      <Icon name="chevronDown" size={12} />
    </DropMenu>
  );
};

export { TopBarShare };
