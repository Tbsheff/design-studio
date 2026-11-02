import { Suspense, lazy } from "react";
import type { ReactElement } from "react";

import type { AccessibilitySectionProps } from "./accessibility-section.js";

const AccessibilitySection = lazy(async () => {
  const loaded = await import("./accessibility-section.js");

  return { default: loaded.AccessibilitySection };
});

const AccessibilitySlot = (props: AccessibilitySectionProps): ReactElement => (
  <Suspense fallback={null}>
    <AccessibilitySection
      directionId={props.directionId}
      projectId={props.projectId}
      target={props.target}
    />
  </Suspense>
);

export { AccessibilitySlot };
