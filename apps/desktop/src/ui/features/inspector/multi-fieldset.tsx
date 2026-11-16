import { useMemo } from "react";
import type { ReactElement, ReactNode } from "react";

import { EffectsSection } from "./inspector-effects.js";
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
}: MultiFieldsetProps): ReactElement => {
  const effects = useMemo(
    () => (
      <EffectsSection
        edit={edit}
        projectId=""
        directionId={null}
        target={null}
      />
    ),
    [edit]
  );

  return (
    <fieldset className="ins-fieldset" disabled={edit.blocked !== null}>
      <SimpleSections
        edit={edit}
        ui={ui}
        selection={null}
        classes={null}
        textStyle={textStyle}
        fill={null}
        effects={effects}
      />
      {rotation.isShown && (
        <MultiRotationField edit={edit} rotation={rotation} />
      )}
    </fieldset>
  );
};

export { MultiFieldset };
