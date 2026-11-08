import type { ReactNode, ReactElement } from "react";

import { TokenControl } from "../versions-layers-tokens/token-control.js";
import type { NumberSpec } from "./number-field-model.js";
import { MemoNumberField } from "./number-field-view.js";

interface SharedFieldProps {
  readonly spec: NumberSpec;
  readonly short: string;
  readonly icon?: ReactNode;
  readonly id?: string;
}

const toTokenControl = (spec: NumberSpec): ReactElement => (
  <TokenControl
    prop={spec.prop}
    label={spec.label}
    edit={spec.edit}
    targets={spec.targets}
  />
);

const NumberField = ({
  spec,
  short,
  icon,
  id,
}: SharedFieldProps): ReactElement => (
  <MemoNumberField
    spec={spec}
    short={short}
    icon={icon}
    id={id}
    toControl={toTokenControl}
  />
);

export { NumberField };

export { NumberInput } from "./number-input.js";

export type { NumberSpec } from "./number-field-model.js";
