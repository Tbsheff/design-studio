import type { ReactElement } from "react";

import { ColorField } from "./color-field.js";
import type { DirectEdit } from "./deps.js";

interface BackgroundFieldProps {
  readonly edit: DirectEdit;
}

const BackgroundField = ({ edit }: BackgroundFieldProps): ReactElement => (
  <ColorField
    prop="background-color"
    label="Background color"
    short="Background"
    edit={edit}
  />
);

export { BackgroundField };
