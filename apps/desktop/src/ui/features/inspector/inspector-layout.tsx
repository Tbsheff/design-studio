import type { SelectionContext } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { isPositioned, PositionRows } from "./position-rows.js";
import { AlignSelf, MinMaxRows } from "./size-limits.js";
import { SizeRow } from "./size-row.js";
import { parentLayout } from "./sizing.js";
import type { DirectEdit } from "./use-direct-edit.js";

const SizeRows = ({
  edit,
  selection,
}: {
  readonly edit: DirectEdit;
  readonly selection: SelectionContext;
}): ReactElement => {
  const parent = parentLayout(selection.styles);

  return (
    <>
      <div className="ins-grid">
        <SizeRow axis="width" edit={edit} selection={selection} />
        <SizeRow axis="height" edit={edit} selection={selection} />
      </div>
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
