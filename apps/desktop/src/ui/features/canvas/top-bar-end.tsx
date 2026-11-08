import { useMemo } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { MenuEntry } from "./top-bar-menu-model.js";
import { OverflowMenu } from "./top-bar-overflow.js";
import { TopBarPresent } from "./top-bar-present.js";
import type { Props } from "./top-bar-props.js";
import { TopBarShare } from "./top-bar-share.js";
import type { ZoomProps } from "./top-bar-zoom-model.js";

const TopBarEnd = ({
  props,
  zoom,
  present,
  onPort,
}: {
  props: Props;
  zoom: ZoomProps;
  present: MenuEntry[];
  onPort: (() => void) | null;
}): ReactElement => {
  const { onAskChat } = props;
  const askChat = useMemo(() => ({ run: onAskChat }), [onAskChat]);

  return (
    <>
      <TopBarPresent present={present} />
      <OverflowMenu
        zoom={zoom}
        present={present}
        viewOpen={props.viewOpen}
        onToggleView={props.onToggleView}
        onReload={props.onReload}
        askChat={askChat}
      />
      <TopBarShare props={props} onPort={onPort} />
      <span
        className="topbar-avatar"
        data-tip={copy.youOnThis}
        data-tip-align="end"
      >
        {copy.keyY}
        <span className="sr-only">{copy.youOnThis}</span>
      </span>
    </>
  );
};

export { TopBarEnd };
