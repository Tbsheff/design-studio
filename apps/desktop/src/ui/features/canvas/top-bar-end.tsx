import { useMemo } from "react";
import type { ReactElement } from "react";

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
      {props.account}
    </>
  );
};

export { TopBarEnd };
