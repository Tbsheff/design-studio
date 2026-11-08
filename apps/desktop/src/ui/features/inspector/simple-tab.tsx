import type { ReactElement } from "react";

import { imageKindOf } from "../../../shared/image.js";
import { AccessibilitySection } from "./accessibility-section.js";
import { ComponentSection } from "./component-section.js";
import { copy } from "./copy.js";
import { EffectLayersSection } from "./effect-section.js";
import { EmptyState } from "./empty-state.js";
import { GridSection } from "./grid-section.js";
import { ImageSection } from "./image-section.js";
import { toInspectorEmptyReason } from "./inspector-model.js";
import type { InspectorProps } from "./inspector-model.js";
import { SimpleEditor } from "./inspector-simple.js";
import { SimpleMultiEditor } from "./simple-multi-editor.js";
import { StackingSection } from "./stacking-section.js";
import { useEditVariant } from "./use-edit-variant.js";
import { useUseSite } from "./use-use-site.js";
import { VectorSection } from "./vector-section.js";

const SimpleTab = (props: InspectorProps): ReactElement => {
  const variant = useEditVariant();
  const site = useUseSite(props);
  const reason = toInspectorEmptyReason(props.selection, props.isEditable);
  const target = props.selection[0];

  if (
    reason &&
    target &&
    props.isEditable &&
    props.selection.length === 1 &&
    imageKindOf(target)
  ) {
    return (
      <div className="inspector ins-simple">
        <div className="ins-scroll">
          <ImageSection {...props} />
          <EmptyState reason={copy.imageOutside} notice={props.notice} />
        </div>
      </div>
    );
  }

  if (reason || !target) {
    return <EmptyState reason={reason ?? ""} notice={props.notice} />;
  }

  if (props.selection.length > 1) {
    return (
      <SimpleMultiEditor
        key={props.selection
          .map((selectionContext) => selectionContext.selector)
          .join("\n")}
        {...props}
        component={<VectorSection {...props} />}
      />
    );
  }

  return (
    <SimpleEditor
      key={`${target.selector}|${variant}${site.isEditingUse ? "|use" : ""}`}
      {...props}
      target={site.effective ?? target}
      sharedEditing={site.sharedEditing}
      component={
        <>
          <VectorSection {...props} />
          <ImageSection {...props} />
          <GridSection {...props} />
          <EffectLayersSection {...props} />
          <StackingSection {...props} />
          <AccessibilitySection {...props} />
          <ComponentSection {...props} />
        </>
      }
    />
  );
};

export { SimpleTab };
