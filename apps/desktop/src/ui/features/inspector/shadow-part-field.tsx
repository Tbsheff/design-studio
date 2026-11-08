import type { ReactElement } from "react";
import { useMemo } from "react";

import type { Part } from "./effects-model.js";
import { PlainNumberField } from "./plain-number-field.js";
import type { Shadow } from "./shadows-model.js";
import { toPartSpec } from "./use-shadow-row.js";
import type { ShadowFieldSpec } from "./use-shadow-row.js";

const ShadowPartField = ({
  field,
  part,
  short,
  label,
  min,
  shadow,
  count,
}: {
  readonly field: ShadowFieldSpec;
  readonly part: Part;
  readonly short: string;
  readonly label: string;
  readonly min: number | null;
  readonly shadow: Shadow;
  readonly count: number;
}): ReactElement => {
  const value = shadow[part];

  const spec = useMemo(
    () => toPartSpec(field, { label, min, part }, value, count),
    [field, label, min, part, value, count]
  );

  return (
    <PlainNumberField
      id={`ins-shadow-${field.index}-${part}`}
      short={short}
      spec={spec}
    />
  );
};

export { ShadowPartField };
