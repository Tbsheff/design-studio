import type { SelectionContext } from "@design-studio/contracts";
import { memo, useMemo } from "react";
import type { ReactElement } from "react";

import { AutoLayoutSection } from "./auto-layout-section.js";
import { BoxModel } from "./box-model.js";
import { copy } from "./copy.js";
import { SIDES } from "./css-values.js";
import type { DirectEdit } from "./deps.js";
import { LayoutLead } from "./layout-lead.js";
import { BOX_PROPS, toDeclaredMargins } from "./simple-model.js";
import { isSameEditValues } from "./use-direct-edit.js";

interface LayoutSectionProps {
  readonly edit: DirectEdit;
  readonly selection: SelectionContext | null;
}

const BoxModelMemo = memo(
  BoxModel,
  (first, second) =>
    isSameEditValues(first.edit, second.edit, BOX_PROPS) &&
    first.edit.dirty.join(",") === second.edit.dirty.join(",") &&
    SIDES.every((side) => first.declared?.[side] === second.declared?.[side])
);

const LayoutSection = ({
  edit,
  selection,
}: LayoutSectionProps): ReactElement => {
  const lead = useMemo(
    () => <LayoutLead edit={edit} selection={selection} />,
    [edit, selection]
  );

  return (
    <AutoLayoutSection edit={edit} title={copy.layout} lead={lead}>
      <BoxModelMemo edit={edit} declared={toDeclaredMargins(selection)} />
    </AutoLayoutSection>
  );
};

export { LayoutSection };
