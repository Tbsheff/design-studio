import type { ReactElement, ReactNode } from "react";

import { MultiRotationField } from "./multi-rotation-field.js";
import type { MultiEdit } from "./simple-model.js";
import { SimpleSections } from "./simple-sections.js";
import type { Rotation } from "./use-rotation.js";
import type { TokenUi } from "./use-token-snap.js";

interface MultiFieldsetProps {
  readonly edit: MultiEdit;
  readonly ui: TokenUi | null;
  readonly textStyle: ReactNode;
  readonly rotation: Rotation;
}

const MultiFieldset = ({
  edit,
  ui,
  textStyle,
  rotation,
}: MultiFieldsetProps): ReactElement => (
  <fieldset className="ins-fieldset" disabled={edit.blocked !== null}>
    <SimpleSections
      edit={edit}
      ui={ui}
      selection={null}
      classes={null}
      textStyle={textStyle}
      layout={null}
      hasEffectLayers={false}
      hasEffectShadow={false}
      fill={null}
    />
    {rotation.isShown && <MultiRotationField edit={edit} rotation={rotation} />}
  </fieldset>
);

export { MultiFieldset };
