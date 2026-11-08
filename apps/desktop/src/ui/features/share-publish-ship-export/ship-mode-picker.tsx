import type { ShipMode, ShipPrepare } from "@design-studio/contracts/ship";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { ShipModeOption } from "./ship-mode-option.js";
import { MODES, modeBlock } from "./ship-model.js";

interface ShipModePickerProps {
  readonly plan: ShipPrepare;
  readonly mode: ShipMode;
  readonly onMode: (mode: ShipMode) => void;
}

const ShipModePicker = ({
  mode,
  onMode,
  plan,
}: ShipModePickerProps): ReactElement => (
  <fieldset className="ship-modes ship-wide">
    <legend>{copy.whenDone}</legend>
    {MODES.map((entry) => (
      <ShipModeOption
        key={entry.id}
        id={entry.id}
        label={entry.label}
        hint={entry.hint}
        blockedBy={modeBlock(plan, entry.id)}
        isChecked={mode === entry.id}
        onMode={onMode}
      />
    ))}
  </fieldset>
);

export { ShipModePicker };
