import type { ReactElement } from "react";

import { UserMessage } from "./chat-parts.js";
import { PendingAssistant } from "./pending-assistant.js";
import type { RunView } from "./run-state-model.js";

const PendingEntry = ({
  run,
  workTree,
}: {
  run: RunView;
  workTree: string | null;
}): ReactElement => (
  <div className="run flex min-w-0 flex-col gap-3.5" data-pending-run="">
    <UserMessage run={run} />
    <PendingAssistant run={run} workTree={workTree} />
  </div>
);

export { PendingEntry };
