import type { ReactElement } from "react";
import { Suspense, lazy } from "react";

import type { InspectorProps } from "./inspector-model.js";

const InspectorPropsPanel = lazy(async () => {
  const loaded = await import("./inspector-props.js");

  return { default: loaded.InspectorPropsPanel };
});

const ComponentSection = (props: InspectorProps): ReactElement | null => {
  const [target] = props.selection;

  if (props.selection.length !== 1 || !target || !props.directionId) {
    return null;
  }

  const hasOwners = Boolean(target.owners?.length);

  if (!hasOwners && !target.usedAt) {
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
