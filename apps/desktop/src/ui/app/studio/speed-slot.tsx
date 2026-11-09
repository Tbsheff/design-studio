import { Suspense } from "react";
import type { ReactNode } from "react";

import { SpeedPanel } from "../../features/speed/index.js";

interface SpeedSlotScope {
  readonly directionId: string | null;
  readonly frameId: string;
  readonly isLive: boolean;
  readonly projectId: string;
}

const renderSpeedSlot = (scope: SpeedSlotScope): ReactNode => (
  <Suspense fallback={null}>
    <SpeedPanel
      directionId={scope.directionId}
      frameId={scope.frameId}
      isLive={scope.isLive}
      key={scope.frameId}
      projectId={scope.projectId}
    />
  </Suspense>
);

export { renderSpeedSlot };
