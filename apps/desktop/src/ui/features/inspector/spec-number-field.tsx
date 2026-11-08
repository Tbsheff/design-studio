import { useMemo } from "react";
import type { ReactElement } from "react";

import type { DirectEdit } from "./deps.js";
import { NumberField } from "./number-field.js";
import type { NumberFieldConfig } from "./simple-model.js";

interface SpecNumberFieldProps {
  readonly edit: DirectEdit;
  readonly field: NumberFieldConfig;
}

const SpecNumberField = ({
  edit,
  field,
}: SpecNumberFieldProps): ReactElement => {
  const spec = useMemo(() => ({ ...field.spec, edit }), [field, edit]);

  return <NumberField short={field.short} spec={spec} />;
};

export { SpecNumberField };
