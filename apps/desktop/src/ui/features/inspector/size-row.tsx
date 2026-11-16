import type { SelectionContext } from "@design-studio/contracts";
import { useCallback } from "react";
import type { PointerEvent as ReactPointerEvent, ReactElement } from "react";

import { useLive } from "../../platform/live-store.js";
import { resizeReadout } from "../canvas/use-resize-handles.js";
import { SizeModeSelect } from "./size-mode-select.js";
import { toLiveFacts, toResizing } from "./size-row-model.js";
import { SizeSlot } from "./size-slot.js";
import { toParentLayout, toSizeMode } from "./sizing-model.js";
import type { Axis } from "./sizing-model.js";
import type { DirectEdit } from "./use-direct-edit.js";
import { startFixedDrag } from "./use-fixed-drag.js";

const SizeRow = ({
  axis,
  edit,
  fieldEdit,
  selection,
}: {
  readonly axis: Axis;
  readonly edit: DirectEdit;
  readonly fieldEdit: DirectEdit | null;
  readonly selection: SelectionContext;
}): ReactElement => {
  const parent = toParentLayout(selection.styles);
  const facts = toLiveFacts(edit, selection);
  const mode = toSizeMode(axis, edit.values, parent, facts);
  const used = selection.styles[`used-${axis}`] ?? edit.values[axis];
  const live = useLive(resizeReadout);
  const resizing = toResizing(live, selection.selector);

  const drag = useCallback(
    (event: ReactPointerEvent<HTMLLabelElement>) =>
      startFixedDrag(event, { axis, edit, facts, parent, used }),
    [axis, edit, facts, parent, used]
  );

  return (
    <div className="ins-size-pair">
      <SizeSlot
        key={selection.selector}
        axis={axis}
        mode={mode}
        used={used}
        edit={fieldEdit ?? edit}
        resizing={resizing}
        onDrag={drag}
      />
      <SizeModeSelect
        axis={axis}
        edit={edit}
        mode={mode}
        parent={parent}
        facts={facts}
        used={used}
      />
    </div>
  );
};

export { SizeRow };
