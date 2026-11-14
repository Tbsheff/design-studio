import type { ReactElement } from "react";

import { ColorField } from "./color-field.js";
import { strokePositionCopy } from "./copy.js";
import type { DirectEdit } from "./deps.js";
import { SelectField } from "./select-field.js";
import { BORDER_STYLES } from "./simple-model.js";
import { SpecNumberField } from "./spec-number-field.js";
import { OUTLINE_WIDTH } from "./stroke-position-model.js";

interface StrokePositionOutlineProps {
  readonly edit: DirectEdit;
}

const StrokePositionOutline = ({
  edit,
}: StrokePositionOutlineProps): ReactElement => (
  <>
    <SpecNumberField edit={edit} field={OUTLINE_WIDTH} />
    <SelectField
      prop="outline-style"
      label={strokePositionCopy.styleLabel}
      short={strokePositionCopy.style}
      edit={edit}
      options={BORDER_STYLES}
    />
    <div className="wide">
      <ColorField
        prop="outline-color"
        label={strokePositionCopy.colorLabel}
        short={strokePositionCopy.color}
        edit={edit}
      />
    </div>
  </>
);

export { StrokePositionOutline };
