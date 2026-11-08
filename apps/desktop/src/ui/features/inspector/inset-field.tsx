import type { ReactElement } from "react";
import { useMemo } from "react";

import type { InsetProp } from "./constraints-model.js";
import type { DirectEdit } from "./deps.js";
import { NumberField } from "./number-field.js";
import { INSET_FIELDS } from "./position-model.js";

const InsetField = ({
  edit,
  prop,
}: {
  readonly edit: DirectEdit;
  readonly prop: InsetProp;
}): ReactElement => {
  const { label, short } = INSET_FIELDS[prop];
  const spec = useMemo(() => ({ edit, label, prop }), [edit, label, prop]);

  return <NumberField short={short} spec={spec} />;
};

export { InsetField };
