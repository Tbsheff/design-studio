import type { ReactElement } from "react";

import { toAnnouncement } from "./run-announcer-model.js";
import type { RunView } from "./run-state-model.js";

const RunAnnouncer = ({ run }: { run: RunView | undefined }): ReactElement => (
  <output className="sr-only" aria-live="polite" aria-atomic="true">
    {toAnnouncement(run)}
  </output>
);

export { RunAnnouncer };
