import type { SelectionContext } from "@design-studio/contracts";
import { Suspense, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";

import { EffectSlot } from "../../inspector-slots.js";
import { copy } from "./copy.js";
import { CustomShadow } from "./custom-shadow.js";
import { getShadowView } from "./effects-model.js";
import { InspectorSection } from "./inspector-fields.js";
import { LayerBlur } from "./layer-blur.js";
import { ShadowList } from "./shadow-list.js";
import { toExtrasInUse } from "./simple-model.js";
import type { DirectEdit } from "./use-direct-edit.js";
import { useEditVariant } from "./use-edit-variant.js";

interface EffectsSectionProps {
  readonly edit: DirectEdit;
  readonly projectId: string;
  readonly directionId: string | null;
  readonly target: SelectionContext | null;
}

const toShadowRows = (edit: DirectEdit): ReactNode => {
  if (!toExtrasInUse(edit).has("shadow")) {
    return null;
  }

  const view = getShadowView(edit);

  return (
    <>
      {view === null && <CustomShadow edit={edit} />}
      {view !== null && <ShadowList edit={edit} view={view} />}
      <div className="ins-grid">
        <LayerBlur edit={edit} />
      </div>
    </>
  );
};

const EffectsSection = ({
  edit,
  projectId,
  directionId,
  target,
}: EffectsSectionProps): ReactElement | null => {
  const variant = useEditVariant();
  const shadows = useMemo(() => toShadowRows(edit), [edit]);

  if (!directionId || !target?.source) {
    if (shadows === null) {
      return null;
    }

    return <InspectorSection title={copy.effects}>{shadows}</InspectorSection>;
  }

  return (
    <InspectorSection title={copy.effects}>
      <Suspense fallback={null}>
        <EffectSlot
          key={target.selector}
          directionId={directionId}
          fallback={shadows}
          projectId={projectId}
          target={target}
          variant={variant}
        />
      </Suspense>
    </InspectorSection>
  );
};

export { EffectsSection };
