import type { ReactElement } from "react";
import { Suspense, lazy } from "react";

import { imageKindOf } from "../../../shared/image.js";
import type { InspectorProps } from "./inspector-model.js";

const InspectorImage = lazy(() => import("./inspector-image.js"));

const ImageSection = (props: InspectorProps): ReactElement | null => {
  const [target] = props.selection;

  if (
    props.selection.length !== 1 ||
    !target ||
    !props.directionId ||
    !imageKindOf(target)
  ) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <InspectorImage
        key={target.selector}
        projectId={props.projectId}
        directionId={props.directionId}
        selection={target}
        isEditable={props.isEditable}
        port={props.port}
      />
    </Suspense>
  );
};

export { ImageSection };
