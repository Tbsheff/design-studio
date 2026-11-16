import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { CustomShadow } from "./custom-shadow.js";
import { getShadowView } from "./effects-model.js";
import { InspectorSection } from "./inspector-fields.js";
import { LayerBlur } from "./layer-blur.js";
import { ShadowList } from "./shadow-list.js";
import type { DirectEdit } from "./use-direct-edit.js";
import { useScrollInOnMount } from "./use-scroll-in-on-mount.js";

const EffectsSection = ({
  edit,
  isRevealed,
}: {
  readonly edit: DirectEdit;
  readonly isRevealed: boolean;
}): ReactElement => {
  const view = getShadowView(edit);
  const anchor = useScrollInOnMount(isRevealed);

  return (
    <InspectorSection title={copy.shadowTitle}>
      <span ref={anchor} hidden />
      {view === null && <CustomShadow edit={edit} />}
      {view !== null && <ShadowList edit={edit} view={view} />}
      <div className="ins-grid">
        <LayerBlur edit={edit} />
      </div>
    </InspectorSection>
  );
};

export { EffectsSection };
