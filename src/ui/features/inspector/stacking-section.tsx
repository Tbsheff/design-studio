import { Suspense } from "react";

import { StackingSlot } from "../../inspector-slots.js";
import type { InspectorProps } from "./inspector-model.js";

const StackingSection = (props: InspectorProps) => {
  const target = props.selection[0];

  if (
    props.selection.length !== 1 ||
    !target ||
    !props.directionId ||
    !props.editable ||
    !target.source
  ) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <StackingSlot
        key={target.selector}
        projectId={props.projectId}
        directionId={props.directionId}
        target={target}
      />
    </Suspense>
  );
};

export { StackingSection };
