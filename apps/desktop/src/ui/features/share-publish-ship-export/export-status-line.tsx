import type { ReactElement } from "react";

import { ExportBusyLine } from "./export-busy-line.js";
import { ExportDoneLine } from "./export-done-line.js";
import type { ExportStatus } from "./export-formats.js";
import { useElapsed } from "./use-elapsed.js";

interface ExportStatusLineProps {
  readonly status: ExportStatus;
  readonly isHandoff: boolean;
}

const ExportStatusLine = ({
  isHandoff,
  status,
}: ExportStatusLineProps): ReactElement => {
  const elapsed = useElapsed(status);

  return (
    <div className="export-status" aria-live="polite">
      {status.kind === "busy" && (
        <ExportBusyLine elapsed={elapsed} isHandoff={isHandoff} />
      )}
      {status.kind === "done" && <ExportDoneLine done={status} />}
    </div>
  );
};

export { ExportStatusLine };
