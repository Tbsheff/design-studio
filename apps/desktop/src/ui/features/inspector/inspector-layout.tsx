import type { SelectionContext } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { AlignSelf } from "./align-self.js";
import { AspectLockRow } from "./aspect-lock-row.js";
import type { ElementClasses } from "./element-classes-model.js";
import { MinMaxRows } from "./min-max-rows.js";
import { isPositioned } from "./position-model.js";
import { PositionRows } from "./position-rows.js";
import { ScaleField } from "./scale-field.js";
import { SizeRow } from "./size-row.js";
import { toParentLayout } from "./sizing-model.js";
import { useAspectLock } from "./use-aspect-lock.js";
import type { DirectEdit } from "./use-direct-edit.js";

const SizeRows = ({
  edit,
  selection,
  classes,
}: {
  readonly edit: DirectEdit;
  readonly selection: SelectionContext;
  readonly classes: ElementClasses | null;
}): ReactElement => {
  const parent = toParentLayout(selection.styles);
  const lock = useAspectLock(edit, selection, classes);

  return (
    <>
      <div className="ins-grid">
        <SizeRow
          axis="width"
          edit={edit}
          fieldEdit={null}
          selection={selection}
        />
        <SizeRow
          axis="height"
          edit={edit}
          fieldEdit={lock.heightEdit}
          selection={selection}
        />
        {classes && <AspectLockRow lock={lock} />}
      </div>
      <ScaleField edit={edit} selection={selection} />
      <MinMaxRows edit={edit} />
      {(parent.isFlex || parent.isGrid) &&
        !isPositioned(edit.values.position) && (
          <AlignSelf edit={edit} isColumn={parent.isFlex && !parent.isRow} />
        )}
      <PositionRows edit={edit} selection={selection} />
    </>
  );
};

export { SizeRows };
