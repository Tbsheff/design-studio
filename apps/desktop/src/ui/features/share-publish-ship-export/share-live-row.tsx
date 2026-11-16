import { useCallback } from "react";
import type { ReactElement } from "react";

import { pick } from "../../platform/pick.js";
import { copy } from "./copy.js";
import { ShareSwitchRow } from "./share-switch-row.js";
import { ToggleSwitch } from "./toggle-switch.js";

interface ShareLiveRowProps {
  readonly isOn: boolean;
  readonly isBusy: boolean;
  readonly onChange: (isOn: boolean) => void;
}

const ShareLiveRow = ({
  isBusy,
  isOn,
  onChange,
}: ShareLiveRowProps): ReactElement => {
  const toggleLive = useCallback((): void => {
    onChange(!isOn);
  }, [isOn, onChange]);

  return (
    <ShareSwitchRow
      rowClass="share-lan-row"
      title={copy.live}
      help={pick(isOn, copy.liveOn, copy.liveOff)}
    >
      <ToggleSwitch
        label={copy.liveLabel}
        isOn={isOn}
        isDisabled={isBusy}
        onToggle={toggleLive}
      />
    </ShareSwitchRow>
  );
};

export { ShareLiveRow };
