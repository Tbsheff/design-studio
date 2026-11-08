import { useCallback } from "react";
import type { ReactElement } from "react";

import { ShareSwitchRow } from "./share-switch-row.js";
import { ToggleSwitch } from "./toggle-switch.js";

interface PublishSwitchRowProps {
  readonly title: string;
  readonly help: string;
  readonly isOn: boolean;
  readonly onChange: (isOn: boolean) => void;
}

const PublishSwitchRow = ({
  help,
  isOn,
  onChange,
  title,
}: PublishSwitchRowProps): ReactElement => {
  const toggleRow = useCallback((): void => {
    onChange(!isOn);
  }, [isOn, onChange]);

  return (
    <ShareSwitchRow rowClass="share-lan-row" title={title} help={help}>
      <ToggleSwitch
        label={title}
        isOn={isOn}
        isDisabled={false}
        onToggle={toggleRow}
      />
    </ShareSwitchRow>
  );
};

export { PublishSwitchRow };
