import type { ReactElement, ReactNode } from "react";

import { AutoLayoutBody } from "./auto-layout-body.js";
import { AutoLayoutRemove } from "./auto-layout-remove.js";
import { InspectorSection } from "./inspector-fields.js";
import { isFlexDisplay } from "./sizing.js";
import type { DirectEdit } from "./use-direct-edit.js";

interface Props {
  readonly edit: DirectEdit;
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
  title,
  lead,
  children,
}: Props): ReactElement => (
  <InspectorSection title={title} aside={toRemoveAside(edit)}>
    {lead}
    <AutoLayoutBody edit={edit} />
    {children}
  </InspectorSection>
);

export { AutoLayoutSection };
