import { lazy, Suspense } from "react";
import type { ReactElement } from "react";

import type { FindHost } from "./use-find-host.js";

interface FindPanelSlotProps {
  readonly directionId: string | null;
  readonly host: FindHost;
  readonly projectId: string;
}

const FindPanel = lazy(async () => {
  const panel = await import("./find-panel.js");

  return { default: panel.FindPanel };
});

const FindPanelSlot = ({
  directionId,
  host,
  projectId,
}: FindPanelSlotProps): ReactElement | null => {
  if (!host.isOpen || directionId === null) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <FindPanel directionId={directionId} host={host} projectId={projectId} />
    </Suspense>
  );
};

export { FindPanelSlot };

export type { FindPanelSlotProps };
