import { Suspense, lazy } from "react";

import { vectorShown } from "./inspector-model.js";
import type { InspectorProps } from "./inspector-model.js";

const InspectorVector = lazy(() => import("./inspector-vector.js"));

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
        isEditable={props.isEditable}
      />
    </Suspense>
  );
};

export { VectorSection };
