import type { ReactElement } from "react";

import { toStyleCellClass, toWidthFields } from "./border-side-model.js";
import type { BorderSide } from "./border-side-model.js";
import { ColorField } from "./color-field.js";
import type { DirectEdit } from "./deps.js";
import { SelectField } from "./select-field.js";
import { BORDER_STYLES } from "./simple-model.js";
import { SpecNumberField } from "./spec-number-field.js";

interface BorderInsideFieldsProps {
  readonly edit: DirectEdit;
  readonly side: BorderSide;
}

const BorderInsideFields = ({
  edit,
  side,
}: BorderInsideFieldsProps): ReactElement => {
  const isCustom = side === "custom";

  const widthFields = toWidthFields(side).map((field) => (
    <SpecNumberField key={field.spec.prop} edit={edit} field={field} />
  ));

  return (
    <>
      {!isCustom && widthFields}
      <div className={toStyleCellClass(side)}>
        <SelectField
          prop="border-style"
          label="Border style"
          short="Style"
          edit={edit}
          options={BORDER_STYLES}
        />
      </div>
      {isCustom && widthFields}
      <div className="wide">
        <ColorField
          prop="border-color"
          label="Border color"
          short="Color"
          edit={edit}
        />
      </div>
    </>
  );
};

export { BorderInsideFields };
