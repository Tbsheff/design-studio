import { Suspense, lazy } from "react";
import type { ReactElement } from "react";

import type { FillRowProps } from "./fill-row.js";

const FillRow = lazy(async () => {
  const loaded = await import("./fill-row.js");

  return { default: loaded.FillRow };
});

const FillSlot = ({
  directionId,
  edit,
  fallback,
  port,
  projectId,
  target,
}: FillRowProps): ReactElement => (
  <Suspense fallback={fallback}>
    <FillRow
      directionId={directionId}
      edit={edit}
      fallback={fallback}
      port={port}
      projectId={projectId}
      target={target}
    />
  </Suspense>
);

export { FillSlot };
