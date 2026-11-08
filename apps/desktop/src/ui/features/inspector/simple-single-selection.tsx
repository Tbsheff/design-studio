import { createElement } from "react";
import type { ReactElement } from "react";

import { AccessibilitySection } from "./accessibility-section.js";
import { ComponentSection } from "./component-section.js";
import { EffectLayersSection } from "./effect-section.js";
import { GridSection } from "./grid-section.js";
import { ImageSection } from "./image-section.js";
import type { InspectorProps } from "./inspector-model.js";
import { SimpleEditor } from "./inspector-simple.js";
import { toEditorKey } from "./simple-tab-model.js";
import { StackingSection } from "./stacking-section.js";
import { useEditVariant } from "./use-edit-variant.js";
import { useUseSite } from "./use-use-site.js";
import { VectorSection } from "./vector-section.js";

const SimpleSingleSelection = ({
  inspector,
}: {
  readonly inspector: InspectorProps;
}): ReactElement | null => {
  const variant = useEditVariant();
  const site = useUseSite(inspector);
  const [first] = inspector.selection;
  const { onCommitted, onStale } = inspector;

  if (!first) {
    return null;
  }

  const sections = (
    <>
      {createElement(VectorSection, inspector)}
      {createElement(ImageSection, inspector)}
      {createElement(GridSection, inspector)}
      {createElement(EffectLayersSection, inspector)}
      {createElement(StackingSection, inspector)}
      {createElement(AccessibilitySection, inspector)}
      {createElement(ComponentSection, inspector)}
    </>
  );

  return (
    <SimpleEditor
      key={toEditorKey(first, variant, site.isEditingUse)}
      projectId={inspector.projectId}
      directionId={inspector.directionId}
      selection={inspector.selection}
      port={inspector.port}
      control={inspector.control}
      onCommitted={onCommitted}
      onStale={onStale}
      tokens={inspector.tokens}
      target={site.effective ?? first}
      sharedEditing={site.sharedEditing}
      component={sections}
    />
  );
};

export { SimpleSingleSelection };
