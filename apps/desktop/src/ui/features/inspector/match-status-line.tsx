import type { ReactElement } from "react";

import { toStatusRole } from "./match-rows-model.js";
import type { Status } from "./match-scan-model.js";

const StatusLine = ({
  status,
}: {
  readonly status: Status;
}): ReactElement | null => {
  if (status.kind === "idle") {
    return null;
  }

  return (
    <p className={`sm-status ${status.kind}`} role={toStatusRole(status.kind)}>
      {status.kind === "busy" && <span className="spinner" />}
      {status.text}
    </p>
  );
};

export { StatusLine };
