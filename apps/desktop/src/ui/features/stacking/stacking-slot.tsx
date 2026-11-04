import { Suspense, lazy } from "react";
import type { ReactElement } from "react";

import type { StackingSectionProps } from "./stacking-section.js";

const StackingSection = lazy(async () => {
  const loaded = await import("./stacking-section.js");

  return { default: loaded.StackingSection };
});

const StackingSlot = (props: StackingSectionProps): ReactElement => (
  <Suspense fallback={null}>
    <StackingSection
      directionId={props.directionId}
      projectId={props.projectId}
      target={props.target}
    />
  </Suspense>
);

export { StackingSlot };
