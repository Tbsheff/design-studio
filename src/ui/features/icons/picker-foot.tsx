import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { IconMode } from "./icon-target.js";
import type { Picker } from "./use-picker.js";

interface PickerFootProps {
  readonly mode: IconMode;
  readonly onCancel: () => void;
  readonly picker: Picker;
}

const LABELS = {
  insert: { busy: copy.insertBusy, idle: copy.insert },
  swap: { busy: copy.swapBusy, idle: copy.swap },
} as const;

const submitLabel = (mode: IconMode, busy: boolean): string => {
  if (busy) {
    return LABELS[mode].busy;
  }

  return LABELS[mode].idle;
};

const PickerFoot = ({
  mode,
  onCancel,
  picker,
}: PickerFootProps): ReactElement => {
  const { busy } = picker.insert;

  return (
    <div className="modal-foot">
      <button
        className="btn ghost"
        disabled={busy}
        type="button"
        onClick={onCancel}
      >
        {copy.cancel}
      </button>
      <button
        className="btn primary"
        disabled={busy || picker.icons.length === 0}
        type="submit"
      >
        {submitLabel(mode, busy)}
      </button>
    </div>
  );
};

export { PickerFoot };
