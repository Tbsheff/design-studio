import type { ReactElement, ReactNode } from "react";

import { BackgroundField } from "./background-field.js";
import { copy } from "./copy.js";
import type { DirectEdit } from "./deps.js";
import { RadiusField } from "./inspector-corners.js";
import { OpacityField } from "./opacity-field.js";
import { SelectField } from "./select-field.js";
import { OVERFLOWS } from "./simple-model.js";

interface AppearanceGridProps {
  readonly edit: DirectEdit;
  readonly fill: ReactNode;
}

const AppearanceGrid = ({ edit, fill }: AppearanceGridProps): ReactElement => (
  <div className="ins-grid">
    <div className="wide">{fill || <BackgroundField edit={edit} />}</div>
    <RadiusField edit={edit} short={copy.radius} />
    <SelectField
      prop="overflow"
      label="Overflow"
      short="Overflow"
      edit={edit}
      options={OVERFLOWS}
    />
    <OpacityField edit={edit} />
  </div>
);

export { AppearanceGrid };
