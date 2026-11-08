import type { ReactElement } from "react";

import { ColorField } from "./color-field.js";
import type { DirectEdit } from "./deps.js";
import { SelectField } from "./select-field.js";
import { BORDER_STYLES, BORDER_WIDTH } from "./simple-model.js";
import { SpecNumberField } from "./spec-number-field.js";

interface BorderGridProps {
  readonly edit: DirectEdit;
}

const BorderGrid = ({ edit }: BorderGridProps): ReactElement => (
  <div className="ins-grid">
    <SpecNumberField edit={edit} field={BORDER_WIDTH} />
    <SelectField
      prop="border-style"
      label="Border style"
      short="Style"
      edit={edit}
      options={BORDER_STYLES}
    />
    <div className="wide">
      <ColorField
        prop="border-color"
        label="Border color"
        short="Color"
        edit={edit}
      />
    </div>
  </div>
);

export { BorderGrid };
