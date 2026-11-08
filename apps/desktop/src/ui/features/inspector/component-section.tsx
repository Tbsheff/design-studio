import type { ReactElement } from "react";
import { Suspense, lazy } from "react";

import type { InspectorProps } from "./inspector-model.js";

const InspectorPropsPanel = lazy(() => import("./inspector-props.js"));

const ComponentSection = (props: InspectorProps): ReactElement | null => {
  const target = props.selection[0];

  if (
    props.selection.length !== 1 ||
    !target ||
    !props.directionId ||
    (!target.owners?.length && !target.usedAt)
  ) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <InspectorPropsPanel
        key={target.selector}
        projectId={props.projectId}
        directionId={props.directionId}
        selection={target}
        isEditable={props.isEditable}
      />
    </Suspense>
  );
};

export { ComponentSection };
