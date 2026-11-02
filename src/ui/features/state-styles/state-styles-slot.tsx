import { Suspense, lazy } from "react";
import type { ReactElement } from "react";

import type { StateChipRowProps } from "./state-chip-row.js";

const StateChipRow = lazy(async () => {
  const loaded = await import("./state-chip-row.js");

  return { default: loaded.StateChipRow };
});

const StateStylesSlot = (props: StateChipRowProps): ReactElement => (
  <Suspense fallback={null}>
    <StateChipRow
      directionId={props.directionId}
      port={props.port}
      projectId={props.projectId}
      status={props.status}
      target={props.target}
    />
  </Suspense>
);

export { StateStylesSlot };
