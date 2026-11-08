import { useMemo } from "react";
import type { ReactElement } from "react";

import { NumberField } from "./number-field.js";
import type { NumberSpec } from "./number-field.js";
import type { DirectEdit } from "./use-direct-edit.js";

const min = 0;

const LimitField = ({
  edit,
  label,
  prop,
  short,
}: {
  readonly edit: DirectEdit;
  readonly label: string;
  readonly prop: NumberSpec["prop"];
  readonly short: string;
}): ReactElement => {
  const spec = useMemo<NumberSpec>(
    () => ({ edit, label, min, prop }),
    [edit, label, prop]
  );

  return <NumberField short={short} spec={spec} />;
};

export { LimitField };
