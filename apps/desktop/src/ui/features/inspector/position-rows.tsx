import type { SelectionContext } from "@design-studio/contracts";
import type { ReactElement } from "react";
import { useCallback } from "react";

import { AbsoluteToggle } from "./absolute-toggle.js";
import { ConstraintRows } from "./constraint-rows.js";
import type { DirectEdit } from "./deps.js";
import { write } from "./layout-keys.js";
import { IN_FLOW, isPositioned, toAbsolutePatch } from "./position-model.js";

const PositionRows = ({
  edit,
  selection,
}: {
  readonly edit: DirectEdit;
  readonly selection: SelectionContext;
}): ReactElement => {
  const isOn = isPositioned(edit.values.position);

  const toggle = useCallback((): void => {
    if (isOn) {
      write(edit, IN_FLOW);

      return;
    }

    write(edit, toAbsolutePatch(selection));
  }, [isOn, edit, selection]);

  return (
    <>
      <AbsoluteToggle isOn={isOn} onToggle={toggle} />
      {isOn && <ConstraintRows edit={edit} selection={selection} />}
    </>
  );
};

export { PositionRows };
