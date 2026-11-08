import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy as uiCopy } from "./copy.js";
import { ToggleSwitch } from "./toggle-switch.js";

interface ConnectHeadProps {
  readonly isOn: boolean;
  readonly isDisabled: boolean;
  readonly onChange: (isEnabled: boolean) => void;
}

const ConnectHead = ({
  isDisabled,
  isOn,
  onChange,
}: ConnectHeadProps): ReactElement => {
  const toggleEnabled = useCallback((): void => {
    onChange(!isOn);
  }, [isOn, onChange]);

  return (
    <div className="export-connect-head">
      <div className="titles">
        <h3>{uiCopy.connectToClaude}</h3>
        <p className="export-sub">{uiCopy.aLocalMcpServer}</p>
      </div>
      <ToggleSwitch
        label={uiCopy.mcpServer}
        isOn={isOn}
        isDisabled={isDisabled}
        onToggle={toggleEnabled}
      />
    </div>
  );
};

export { ConnectHead };
