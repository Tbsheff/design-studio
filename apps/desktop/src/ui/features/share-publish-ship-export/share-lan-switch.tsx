import type { ShareServerState } from "@design-studio/contracts/share";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { ShareLanToggle } from "./share-lan-toggle.js";
import { ShareSwitchRow } from "./share-switch-row.js";

interface ShareLanSwitchProps {
  readonly server: ShareServerState;
  readonly hasLive: boolean;
  readonly isBusy: boolean;
  readonly onChange: (isOn: boolean) => void;
}

const toLanHelp = (server: ShareServerState): string => {
  if (server.lan && server.lanUrl) {
    return `${copy.lanOnPrefix} ${server.lanUrl}.`;
  }

  return copy.lanOff;
};

const ShareLanSwitch = ({
  hasLive,
  isBusy,
  onChange,
  server,
}: ShareLanSwitchProps): ReactElement => {
  const toggleLan = useCallback((): void => {
    onChange(!server.lan);
  }, [onChange, server.lan]);

  return (
    <div className="share-lan">
      <ShareSwitchRow
        rowClass="share-lan-row"
        title={copy.allowOnLocalNetwork}
        help={toLanHelp(server)}
      >
        <ShareLanToggle
          isOn={server.lan}
          hasLive={hasLive}
          isBusy={isBusy}
          onToggle={toggleLan}
        />
      </ShareSwitchRow>
      {server.lan && (
        <div className="alert share-lan-warn" role="alert">
          {copy.anyoneOnThisNetwork}
        </div>
      )}
    </div>
  );
};

export { ShareLanSwitch };
