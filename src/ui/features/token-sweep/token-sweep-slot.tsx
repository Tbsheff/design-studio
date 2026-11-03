import { Suspense, lazy } from "react";
import type { ReactElement } from "react";

import type { SweepSetup } from "./use-sweep.js";

const SweepPanel = lazy(async () => {
  const loaded = await import("./sweep-panel.js");

  return { default: loaded.SweepPanel };
});

const TokenSweepSlot = (setup: SweepSetup): ReactElement => (
  <Suspense fallback={null}>
    <SweepPanel directionId={setup.directionId} projectId={setup.projectId} />
  </Suspense>
);

export { TokenSweepSlot };
