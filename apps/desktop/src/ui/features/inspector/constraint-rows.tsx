import type { SelectionContext } from "@design-studio/contracts";
import type { ReactElement } from "react";
import { useCallback } from "react";

import { toPinFields } from "./constraints-model.js";
import type { PinAxis, PinMode } from "./constraints-model.js";
import { copy } from "./copy.js";
import type { DirectEdit } from "./deps.js";
import { InsetField } from "./inset-field.js";
import { PinSelect } from "./pin-select.js";
import { usePinModes } from "./use-pin-modes.js";
import { useQueuedPins } from "./use-queued-pins.js";

const ConstraintRows = ({
  edit,
  selection,
}: {
  readonly edit: DirectEdit;
  readonly selection: SelectionContext;
}): ReactElement => {
  const { modes, pick } = usePinModes(selection);
  const { isReady, queue } = useQueuedPins(edit, selection);
  const fields = [...toPinFields("x", modes.x), ...toPinFields("y", modes.y)];

  const pickPin = useCallback(
    (axis: PinAxis, mode: PinMode) => pick({ [axis]: mode }),
    [pick]
  );

  return (
    <>
      {fields.length > 0 && (
        <div className="ins-grid">
          {fields.map((prop) => (
            <InsetField key={prop} edit={edit} prop={prop} />
          ))}
        </div>
      )}
      <fieldset
        className="ins-grid ins-constraints"
        aria-label={copy.constraints}
      >
        <PinSelect
          axis="x"
          mode={modes.x}
          edit={edit}
          selection={selection}
          onPick={pickPin}
          isReady={isReady}
          queue={queue}
        />
        <PinSelect
          axis="y"
          mode={modes.y}
          edit={edit}
          selection={selection}
          onPick={pickPin}
          isReady={isReady}
          queue={queue}
        />
      </fieldset>
    </>
  );
};

export { ConstraintRows };
