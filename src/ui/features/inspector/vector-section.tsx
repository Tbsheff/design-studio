import { Suspense, lazy } from "react";

import { vectorShown, type InspectorProps } from "./inspector-model.js";

const InspectorVector = lazy(
  () => import("../../components/InspectorVector.js")
);

const VectorSection = (props: InspectorProps) => {
  if (!vectorShown(props.selection)) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <InspectorVector
        projectId={props.projectId}
        directionId={props.directionId}
        selection={props.selection}
        editable={props.editable}
      />
    </Suspense>
  );
};

export { VectorSection };
