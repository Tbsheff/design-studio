import { useMemo } from "react";
import type { ReactElement } from "react";

import type { DirectEdit } from "./deps.js";
import { toPercentEdit } from "./opacity-field-model.js";
import { OPACITY } from "./simple-model.js";
import { SpecNumberField } from "./spec-number-field.js";

interface OpacityFieldProps {
  readonly edit: DirectEdit;
}

const OpacityField = ({ edit }: OpacityFieldProps): ReactElement => {
  const percentEdit = useMemo(() => toPercentEdit(edit), [edit]);

  return <SpecNumberField edit={percentEdit} field={OPACITY} />;
};

export { OpacityField };

export type { OpacityFieldProps };
