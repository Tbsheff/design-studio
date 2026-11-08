import type { ReactElement, ReactNode } from "react";

import { BackgroundField } from "./background-field.js";
import type { DirectEdit } from "./deps.js";
import { RadiusField } from "./inspector-corners.js";
import { SelectField } from "./select-field.js";
import { OPACITY, OVERFLOWS } from "./simple-model.js";
import { SpecNumberField } from "./spec-number-field.js";

interface AppearanceGridProps {
  readonly edit: DirectEdit;
  readonly fill: ReactNode;
}

const AppearanceGrid = ({ edit, fill }: AppearanceGridProps): ReactElement => (
  <div className="ins-grid">
    <div className="wide">{fill || <BackgroundField edit={edit} />}</div>
    <RadiusField edit={edit} short="Radius" />
    <SelectField
      prop="overflow"
      label="Overflow"
      short="Overflow"
      edit={edit}
      options={OVERFLOWS}
    />
    <SpecNumberField edit={edit} field={OPACITY} />
  </div>
);

export { AppearanceGrid };
