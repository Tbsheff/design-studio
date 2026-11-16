import { useCallback } from "react";
import type { ReactElement } from "react";

import { pick } from "../../platform/pick.js";
import { copy as uiCopy } from "./copy.js";
import { ToggleSwitch } from "./toggle-switch.js";

interface ConnectEditsRowProps {
  readonly isAllowed: boolean;
  readonly isBusy: boolean;
  readonly onChange: (isAllowed: boolean) => void;
}

const ConnectEditsRow = ({
  isAllowed,
  isBusy,
  onChange,
}: ConnectEditsRowProps): ReactElement => {
  const toggle = useCallback((): void => {
    onChange(!isAllowed);
  }, [isAllowed, onChange]);

  return (
    <div className="export-connect-head export-control">
      <div className="titles">
        <h4>{uiCopy.allowEdits}</h4>
        <p className="export-sub">
          {pick(isAllowed, uiCopy.editsOnNote, uiCopy.editsOffNote)}
        </p>
      </div>
      <ToggleSwitch
        label={uiCopy.allowEdits}
        isOn={isAllowed}
        isDisabled={isBusy}
        onToggle={toggle}
      />
    </div>
  );
};

export { ConnectEditsRow };
