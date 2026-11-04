import { Suspense } from "react";

import { AccessibilitySlot } from "../../inspector-slots.js";
import type { InspectorProps } from "./inspector-model.js";

const AccessibilitySection = (props: InspectorProps) => {
  const target = props.selection[0];

  if (
    props.selection.length !== 1 ||
    !target ||
    !props.directionId ||
    !props.editable
  ) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <AccessibilitySlot
        key={target.selector}
        projectId={props.projectId}
        directionId={props.directionId}
        target={target}
      />
    </Suspense>
  );
};

export { AccessibilitySection };
