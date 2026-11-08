import type { ReactElement } from "react";
import { Suspense, lazy } from "react";

import { isVectorShown } from "./inspector-model.js";
import type { InspectorProps } from "./inspector-model.js";

const InspectorVector = lazy(async () => {
  await import("../../styles/vector.css");
  const loaded = await import("./inspector-vector.js");

  return { default: loaded.InspectorVector };
});

const VectorSection = (props: InspectorProps): ReactElement | null => {
  if (!isVectorShown(props.selection)) {
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
