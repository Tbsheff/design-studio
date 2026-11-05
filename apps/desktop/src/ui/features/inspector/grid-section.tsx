import { Suspense } from "react";
import type { ReactElement } from "react";

import { GridSlot } from "../../inspector-slots.js";
import { useEditVariant } from "./edit-variant.js";
import type { InspectorProps } from "./inspector-model.js";

const GridSection = (props: InspectorProps): ReactElement | null => {
  const { directionId, editable, projectId, selection } = props;
  const variant = useEditVariant();
  const [target] = selection;
  const isReady = selection.length === 1 && editable && Boolean(directionId);

  if (!isReady || !target?.source) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <GridSlot
        key={target.selector}
        directionId={directionId ?? ""}
        projectId={projectId}
        target={target}
        variant={variant}
      />
    </Suspense>
  );
};

export { GridSection };
