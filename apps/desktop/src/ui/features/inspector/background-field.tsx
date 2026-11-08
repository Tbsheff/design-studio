import type { ReactElement } from "react";

import type { DirectEdit } from "./deps.js";
import { ColorField } from "./inspector-fields.js";

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
