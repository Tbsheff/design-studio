import type { ShareLink } from "@design-studio/contracts/share";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { pick } from "./pick.js";
import { ShareSwitchRow } from "./share-switch-row.js";
import { ToggleSwitch } from "./toggle-switch.js";

interface ShareCursorSwitchProps {
  readonly link: ShareLink;
  readonly isBusy: boolean;
  readonly onCursor: (id: string, isOn: boolean) => void;
}

const ShareCursorSwitch = ({
  isBusy,
  link,
  onCursor,
}: ShareCursorSwitchProps): ReactElement => {
  const toggleCursor = useCallback((): void => {
    onCursor(link.id, !link.studioCursor);
  }, [link.id, link.studioCursor, onCursor]);

  return (
    <ShareSwitchRow
      rowClass="share-lan-row share-cursor-row"
      title={copy.showMyCursorTo}
      help={pick(link.studioCursor, copy.cursorOn, copy.cursorOff)}
    >
      <ToggleSwitch
        label={copy.showCursorLabel}
        isOn={link.studioCursor}
        isDisabled={isBusy}
        onToggle={toggleCursor}
      />
    </ShareSwitchRow>
  );
};

export { ShareCursorSwitch };
