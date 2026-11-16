import { Suspense } from "react";
import type { ReactElement } from "react";

import { EffectSlot } from "../../inspector-slots.js";
import { EffectsFrame } from "./effects-frame.js";
import { hasBoxShadow } from "./effects-model.js";
import type { InspectorProps } from "./inspector-model.js";
import { useEditVariant } from "./use-edit-variant.js";

const EffectLayersSection = (props: InspectorProps): ReactElement | null => {
  const { directionId, isEditable: editable, projectId, selection } = props;
  const [target] = selection;
  const variant = useEditVariant();
  const isReady = selection.length === 1 && editable && Boolean(directionId);

  if (!isReady || !target?.source) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <EffectSlot
        key={target.selector}
        directionId={directionId ?? ""}
        projectId={projectId}
        target={target}
        variant={variant}
        isHiddenWhenEmpty={hasBoxShadow(target.styles)}
        frame={EffectsFrame}
      />
    </Suspense>
  );
};

export { EffectLayersSection };
