import { Suspense, lazy } from "react";
import type { ReactElement } from "react";

import type { MotionSectionProps } from "./motion-section.js";

const MotionSection = lazy(async () => {
  const loaded = await import("./motion-section.js");

  return { default: loaded.MotionSection };
});

const MotionSlot = ({
  directionId,
  port,
  projectId,
  target,
}: MotionSectionProps): ReactElement => (
  <Suspense fallback={null}>
    <MotionSection
      directionId={directionId}
      port={port}
      projectId={projectId}
      target={target}
    />
  </Suspense>
);

export { MotionSlot };
