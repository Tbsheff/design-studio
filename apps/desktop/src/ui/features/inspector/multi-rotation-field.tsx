import type { ReactElement } from "react";

import { rotationCopy } from "./copy.js";
import { InspectorSection } from "./inspector-fields.js";
import { RotationField } from "./rotation-field.js";
import type { MultiEdit } from "./simple-model.js";
import type { Rotation } from "./use-rotation.js";

const MultiRotationField = ({
  edit,
  rotation,
}: {
  readonly edit: MultiEdit;
  readonly rotation: Rotation;
}): ReactElement => (
  <InspectorSection title={rotationCopy.label}>
    <RotationField edit={edit} inputRef={rotation.inputRef} />
  </InspectorSection>
);

export { MultiRotationField };
