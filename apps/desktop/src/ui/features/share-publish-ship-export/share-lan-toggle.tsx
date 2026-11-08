import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { pick } from "./pick.js";
import { ToggleSwitch } from "./toggle-switch.js";

interface ShareLanToggleProps {
  readonly isOn: boolean;
  readonly hasLive: boolean;
  readonly isBusy: boolean;
  readonly onToggle: () => void;
}

const ShareLanToggle = ({
  hasLive,
  isBusy,
  isOn,
  onToggle,
}: ShareLanToggleProps): ReactElement => (
  <span data-tip={pick(hasLive, null, copy.makeLinkFirst)}>
    <ToggleSwitch
      label={copy.allowOnLanLabel}
      isOn={isOn}
      isDisabled={isBusy || (!hasLive && !isOn)}
      onToggle={onToggle}
    />
  </span>
);

export { ShareLanToggle };
