import type { SelectionContext } from "@design-studio/contracts";
import type { ReactElement } from "react";
import { useCallback } from "react";

import { AbsoluteToggle } from "./absolute-toggle.js";
import { ConstraintRows } from "./constraint-rows.js";
import type { DirectEdit } from "./deps.js";
import { IN_FLOW, isPositioned, toAbsolutePatch } from "./position-model.js";
import { RotationField } from "./rotation-field.js";
import { setEdit } from "./use-layout-keys.js";
import { useRotation } from "./use-rotation.js";

const PositionRows = ({
  edit,
  selection,
}: {
  readonly edit: DirectEdit;
  readonly selection: SelectionContext;
}): ReactElement => {
  const isOn = isPositioned(edit.values.position);
  const rotation = useRotation(edit);

  const toggle = useCallback((): void => {
    if (isOn) {
      setEdit(edit, IN_FLOW);

      return;
    }

    setEdit(edit, toAbsolutePatch(selection));
  }, [isOn, edit, selection]);

  return (
    <>
      <AbsoluteToggle isOn={isOn} onToggle={toggle} />
      {isOn && <ConstraintRows edit={edit} selection={selection} />}
      {rotation.isShown && (
        <RotationField edit={edit} inputRef={rotation.inputRef} />
      )}
    </>
  );
};

export { PositionRows };
