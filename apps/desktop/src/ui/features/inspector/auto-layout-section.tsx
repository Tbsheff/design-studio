import type { SelectionContext } from "@design-studio/contracts";
import type { ReactElement, ReactNode } from "react";

import { AutoLayoutBody } from "./auto-layout-body.js";
import { AutoLayoutRemove } from "./auto-layout-remove.js";
import type { ElementClasses } from "./element-classes-model.js";
import { InspectorSection } from "./inspector-fields.js";
import { isFlexDisplay } from "./sizing-model.js";
import type { DirectEdit } from "./use-direct-edit.js";

interface Props {
  readonly edit: DirectEdit;
  readonly selection: SelectionContext | null;
  readonly classes: ElementClasses | null;
  readonly title: string;
  readonly lead: ReactNode;
  readonly children: ReactNode;
}

const toRemoveAside = (edit: DirectEdit): ReactNode => {
  if (isFlexDisplay(edit.values.display)) {
    return <AutoLayoutRemove edit={edit} />;
  }

  return null;
};

const AutoLayoutSection = ({
  edit,
  selection,
  classes,
  title,
  lead,
  children,
}: Props): ReactElement => (
  <InspectorSection title={title} aside={toRemoveAside(edit)}>
    {lead}
    <AutoLayoutBody edit={edit} selection={selection} classes={classes} />
    {children}
  </InspectorSection>
);

export { AutoLayoutSection };
