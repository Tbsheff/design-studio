import type { SelectionContext } from "@design-studio/contracts";
import type { ReactElement } from "react";

import type { DirectEdit } from "./deps.js";
import type { ElementClasses } from "./element-classes-model.js";
import { SizeRows } from "./inspector-layout.js";
import { MinMaxRows } from "./min-max-rows.js";
import { HEIGHT, WIDTH } from "./simple-model.js";
import { SpecNumberField } from "./spec-number-field.js";

interface LayoutLeadProps {
  readonly edit: DirectEdit;
  readonly selection: SelectionContext | null;
  readonly classes: ElementClasses | null;
}

const LayoutLead = ({
  edit,
  selection,
  classes,
}: LayoutLeadProps): ReactElement => {
  if (selection) {
    return <SizeRows edit={edit} selection={selection} classes={classes} />;
  }

  return (
    <>
      <div className="ins-grid">
        <SpecNumberField edit={edit} field={WIDTH} />
        <SpecNumberField edit={edit} field={HEIGHT} />
      </div>
      <MinMaxRows edit={edit} />
    </>
  );
};

export { LayoutLead };
