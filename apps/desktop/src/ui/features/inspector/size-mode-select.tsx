import type { ReactElement } from "react";
import { useCallback } from "react";

import { InspectorSelect } from "./inspector-select.js";
import { AXIS_NAME } from "./size-row-model.js";
import { SIZE_MODES, toSizePatch } from "./sizing-model.js";
import type {
  Axis,
  ParentLayout,
  SizeFacts,
  SizeMode,
} from "./sizing-model.js";
import type { DirectEdit } from "./use-direct-edit.js";
import { setEdit } from "./use-layout-keys.js";

const SizeModeSelect = ({
  axis,
  edit,
  mode,
  parent,
  facts,
  used,
}: {
  readonly axis: Axis;
  readonly edit: DirectEdit;
  readonly mode: SizeMode;
  readonly parent: ParentLayout;
  readonly facts: SizeFacts;
  readonly used: string;
}): ReactElement => {
  const change = useCallback(
    (next: string) => {
      const picked = SIZE_MODES.find((option) => option.value === next);

      if (picked) {
        setEdit(
          edit,
          toSizePatch(
            axis,
            picked.value,
            { parent, usedPx: used, values: edit.values },
            facts
          )
        );
      }
    },
    [axis, edit, parent, facts, used]
  );

  return (
    <div className="ins-field select ins-size-field">
      <InspectorSelect
        id={`ins-${axis}-mode`}
        label={`${AXIS_NAME[axis]} sizing`}
        value={mode}
        placeholder=""
        isDisabled={false}
        options={SIZE_MODES}
        onChange={change}
      />
    </div>
  );
};

export { SizeModeSelect };
