import type { SelectionContext } from "../../../shared/contracts.js";
import { InspectorSection } from "./inspector-fields.js";
import { isPositioned, PositionRows } from "./position-rows.js";
import { AlignSelf, MinMaxRows } from "./size-limits.js";
import { SizeRow } from "./size-row.js";
import { parentLayout } from "./sizing.js";
import type { DirectEdit } from "./use-direct-edit.js";

const SizeRows = ({
  edit,
  selection,
}: {
  edit: DirectEdit;
  selection: SelectionContext;
}) => {
  const parent = parentLayout(selection.styles);

  return (
    <>
      <div className="ins-grid">
        <SizeRow axis="width" edit={edit} selection={selection} />
        <SizeRow axis="height" edit={edit} selection={selection} />
      </div>
      <MinMaxRows edit={edit} />
      {(parent.flex || parent.grid) && !isPositioned(edit.values.position) && (
        <AlignSelf edit={edit} column={parent.flex && !parent.row} />
      )}
      <PositionRows edit={edit} selection={selection} />
    </>
  );
};

const SizeSection = ({
  edit,
  selection,
}: {
  edit: DirectEdit;
  selection: SelectionContext;
}) => (
  <InspectorSection title="Size">
    <SizeRows edit={edit} selection={selection} />
  </InspectorSection>
);

export { SizeRows, SizeSection };
