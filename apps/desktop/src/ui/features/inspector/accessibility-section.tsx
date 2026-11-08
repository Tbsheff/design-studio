import type { ReactElement } from "react";
import { Suspense } from "react";

import { AccessibilitySlot } from "../../inspector-slots.js";
import type { InspectorProps } from "./inspector-model.js";

const AccessibilitySection = (props: InspectorProps): ReactElement | null => {
  const target = props.selection[0];

  if (
    props.selection.length !== 1 ||
    !target ||
    !props.directionId ||
    !props.isEditable
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
