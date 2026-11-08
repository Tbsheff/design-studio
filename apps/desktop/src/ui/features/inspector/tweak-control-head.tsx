import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";
import { useCallback } from "react";

import type { TweakControl, TweakValue } from "../../../shared/tweaks.js";
import { copy } from "./copy.js";
import { toLabelFor, toReadout, toResetClass } from "./tweaks-model.js";

const TweakControlHead = ({
  control,
  value,
  isChanged,
  onRevert,
}: {
  readonly control: TweakControl;
  readonly value: TweakValue;
  readonly isChanged: boolean;
  readonly onRevert: (id: string) => void;
}): ReactElement => {
  const revert = useCallback(
    () => onRevert(control.id),
    [onRevert, control.id]
  );

  return (
    <div className="twk-row-head" data-tip={control.cssVar}>
      <label className="twk-label truncate" htmlFor={toLabelFor(control)}>
        {control.label}
      </label>
      {control.type !== "color" && (
        <span className="twk-toReadout">{toReadout(control, value)}</span>
      )}
      <button
        type="button"
        className={`icon-btn small twk-reset ${toResetClass(isChanged)}`}
        aria-label={`Reset ${control.label}`}
        data-tip={copy.reset}
        data-tip-align="end"
        disabled={!isChanged}
        onClick={revert}
      >
        <Icon name="undo" size={12} />
      </button>
    </div>
  );
};

export { TweakControlHead };
