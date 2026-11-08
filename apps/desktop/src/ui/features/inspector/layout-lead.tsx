import type { SelectionContext } from "@design-studio/contracts";
import type { ReactElement } from "react";

import type { DirectEdit } from "./deps.js";
import { SizeRows } from "./inspector-layout.js";
import { HEIGHT, WIDTH } from "./simple-model.js";
import { MinMaxRows } from "./size-limits.js";
import { SpecNumberField } from "./spec-number-field.js";

interface LayoutLeadProps {
  readonly edit: DirectEdit;
  readonly selection: SelectionContext | null;
}

const LayoutLead = ({ edit, selection }: LayoutLeadProps): ReactElement => {
  if (selection) {
    return <SizeRows edit={edit} selection={selection} />;
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
