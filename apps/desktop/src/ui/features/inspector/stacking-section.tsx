import type { ReactElement } from "react";
import { Suspense } from "react";

import { StackingSlot } from "../../inspector-slots.js";
import type { InspectorProps } from "./inspector-model.js";

const isStackable = (props: InspectorProps): boolean => {
  if (props.selection.length !== 1 || !props.directionId) {
    return false;
  }

  return props.isEditable === true;
};

const StackingSection = (props: InspectorProps): ReactElement | null => {
  const [target] = props.selection;

  if (!target?.source || !isStackable(props) || !props.directionId) {
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
