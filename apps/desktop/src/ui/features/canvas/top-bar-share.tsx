import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { DropMenu } from "./top-bar-drop.js";
import { shareGroups } from "./top-bar-menu-model.js";
import type { MenuGroup } from "./top-bar-menu-model.js";
import type { Props } from "./top-bar-props.js";

const CHEVRON = <Icon name="chevronDown" size={12} />;

const toShareTip = (canExport: boolean): string => {
  if (canExport) {
    return copy.shareTip;
  }

  return copy.shareBlocked;
};

const TopBarShare = ({ props }: { props: Props }): ReactElement => {
  const { canExport, onExport, onShip, onShareLink } = props;

  const groups = useCallback(
    (): MenuGroup[] =>
      shareGroups({ canExport, onExport, onShareLink, onShip }),
    [canExport, onExport, onShareLink, onShip]
  );

  const handleShare = useCallback((): void => {
    if (!canExport) {
      return;
    }

    if (onShareLink) {
      onShareLink("link");

      return;
    }

    onExport();
  }, [canExport, onExport, onShareLink]);

  return (
    <span className="topbar-share-split">
      <button
        type="button"
        className="topbar-share"
        aria-disabled={!canExport}
        data-tip={toShareTip(canExport)}
        data-tip-align="end"
        onClick={handleShare}
      >
        <span className="topbar-label">{copy.share}</span>
      </button>
      <DropMenu
        label={copy.shareMore}
        triggerClass="topbar-share topbar-share-more"
        groups={groups}
        align="end"
        tip={copy.shareMore}
      >
        {CHEVRON}
      </DropMenu>
    </span>
  );
};

export { TopBarShare };
