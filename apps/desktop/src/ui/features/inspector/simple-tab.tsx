import { imageKindOf } from "../../../shared/image.js";
import { AccessibilitySection } from "./accessibility-section.js";
import { ComponentSection } from "./component-section.js";
import { copy } from "./copy.js";
import { useEditVariant } from "./edit-variant.js";
import { EffectLayersSection } from "./effect-section.js";
import { EmptyState } from "./empty-state.js";
import { GridSection } from "./grid-section.js";
import { ImageSection } from "./image-section.js";
import { inspectorEmptyReason } from "./inspector-model.js";
import type { InspectorProps } from "./inspector-model.js";
import { SimpleEditor, SimpleMultiEditor } from "./inspector-simple.js";
import { StackingSection } from "./stacking-section.js";
import { useUseSite } from "./use-use-site.js";
import { VectorSection } from "./vector-section.js";

const SimpleTab = (props: InspectorProps) => {
  const variant = useEditVariant();
  const site = useUseSite(props);
  const reason = inspectorEmptyReason(props.selection, props.editable);
  const target = props.selection[0];

  if (
    reason &&
    target &&
    props.editable &&
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
        key={props.selection.map((s) => s.selector).join("\n")}
        {...props}
        component={<VectorSection {...props} />}
      />
    );
  }

  return (
    <SimpleEditor
      key={`${target.selector}|${variant}${site.editingUse ? "|use" : ""}`}
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
