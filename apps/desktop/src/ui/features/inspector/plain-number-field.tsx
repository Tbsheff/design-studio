import type { ReactNode, ReactElement } from "react";

import type { NumberSpec } from "./number-field-model.js";
import { MemoNumberField } from "./number-field-view.js";

interface PlainFieldProps {
  readonly spec: NumberSpec;
  readonly short: string;
  readonly icon?: ReactNode;
  readonly id?: string;
}

const PlainNumberField = ({
  spec,
  short,
  icon,
  id,
}: PlainFieldProps): ReactElement => (
  <MemoNumberField
    spec={spec}
    short={short}
    icon={icon}
    id={id}
    toControl={null}
  />
);

export { PlainNumberField };
