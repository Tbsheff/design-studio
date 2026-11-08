import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { TopBarFileMenu } from "./top-bar-file-menu.js";
import type { Props } from "./top-bar-props.js";

const toTweakTip = (isOpen: boolean): string | null => {
  if (isOpen) {
    return null;
  }

  return "Describe a tweak";
};

const TopBarStart = ({ props }: { props: Props }): ReactElement => (
  <>
    {props.paneCollapsed && (
      <button
        type="button"
        className="icon-btn topbar-icon"
        aria-label={copy.showChatPane}
        data-tip={copy.showPane}
        data-tip-align="start"
        onClick={props.onExpandPane}
      >
        <Icon name="sidebar" size={14} />
      </button>
    )}
    <button
      type="button"
      className="icon-btn topbar-icon topbar-fold-wide"
      aria-label={copy.reloadPreview}
      data-tip={copy.reload}
      data-tip-align="start"
      onClick={props.onReload}
    >
      <Icon name="reload" size={14} />
    </button>
    <button
      type="button"
      className="icon-btn topbar-icon topbar-fold-narrow"
      aria-label={copy.tweak}
      aria-pressed={props.tweakOpen}
      aria-expanded={props.tweakOpen}
      disabled={props.tweakDisabled}
      data-tip={toTweakTip(props.tweakOpen)}
      onClick={props.onTweak}
    >
      <Icon name="sliders" size={14} />
    </button>
    <TopBarFileMenu props={props} />
    <button
      type="button"
      className="icon-btn topbar-icon topbar-fold-wide"
      aria-label={copy.viewOptions}
      aria-pressed={props.viewOpen}
      data-tip={copy.sizeSourceAnd}
      onClick={props.onToggleView}
    >
      <Icon name="more" size={14} />
    </button>
  </>
);

export { TopBarStart };
