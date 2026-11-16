import type { ReactElement } from "react";
import { Suspense } from "react";

import { AccessibilitySlot } from "../../inspector-slots.js";
import { copy } from "./copy.js";
import type { InspectorProps } from "./inspector-model.js";
import { RareSection } from "./rare-section.js";

const AccessibilitySection = (props: InspectorProps): ReactElement | null => {
  const [target] = props.selection;

  if (
    props.selection.length !== 1 ||
    !target ||
    !props.directionId ||
    !props.isEditable
  ) {
    return null;
  }

  return (
    <RareSection title={copy.accessibilityTitle} aside={null} modifier={null}>
      <Suspense fallback={null}>
        <AccessibilitySlot
          key={target.selector}
          projectId={props.projectId}
          directionId={props.directionId}
          target={target}
        />
      </Suspense>
    </RareSection>
  );
};

export { AccessibilitySection };
