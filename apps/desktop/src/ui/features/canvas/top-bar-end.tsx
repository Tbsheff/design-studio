import { useMemo } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { MenuEntry } from "./top-bar-menu.js";
import { TopBarPresent } from "./top-bar-present.js";
import type { Props } from "./top-bar-props.js";
import { TopBarShare } from "./top-bar-share.js";
import { OverflowMenu } from "./top-bar-zoom.js";
import type { ZoomProps } from "./top-bar-zoom.js";

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
  const { onTweak, tweakDisabled, tweakOpen } = props;

  const tweak = useMemo(
    () => ({ disabled: tweakDisabled, open: tweakOpen, run: onTweak }),
    [tweakDisabled, tweakOpen, onTweak]
  );

  return (
    <>
      <TopBarPresent present={present} />
      <OverflowMenu
        zoom={zoom}
        present={present}
        viewOpen={props.viewOpen}
        onToggleView={props.onToggleView}
        onReload={props.onReload}
        tweak={tweak}
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
