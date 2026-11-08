import type { SelectionContext } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { AlignSelf } from "./align-self.js";
import { copy } from "./copy.js";
import { InspectorSection } from "./inspector-fields.js";
import { MinMaxRows } from "./min-max-rows.js";
import { isPositioned, PositionRows } from "./position-rows.js";
import { SizeRow } from "./size-row.js";
import { toParentLayout } from "./sizing.js";
import type { DirectEdit } from "./use-direct-edit.js";

const SizeRows = ({
  edit,
  selection,
}: {
  readonly edit: DirectEdit;
  readonly selection: SelectionContext;
}): ReactElement => {
  const parent = toParentLayout(selection.styles);

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

const SizeSection = ({
  edit,
  selection,
}: {
  readonly edit: DirectEdit;
  readonly selection: SelectionContext;
}): ReactElement => (
  <InspectorSection title={copy.size}>
    <SizeRows edit={edit} selection={selection} />
  </InspectorSection>
);

export { SizeRows, SizeSection };
