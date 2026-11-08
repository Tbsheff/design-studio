import type { ReactElement } from "react";

import { formatTime } from "../../domain/format.js";
import type { UserMessageSlots } from "./chat-parts-model.js";
import { copy } from "./copy.js";
import type { RunView } from "./run-state-model.js";
import { RunTitle } from "./run-title.js";

const UserMessageMeta = ({
  run,
  title,
  titleSlot,
  onRename,
}: {
  run: RunView;
} & Pick<
  UserMessageSlots,
  "onRename" | "title" | "titleSlot"
>): ReactElement => (
  <div className="msg-meta flex items-center gap-2 text-xs text-muted-foreground tabular-nums">
    <RunTitle title={title} slot={titleSlot} onRename={onRename} />
    <time>{formatTime(run.startedAt)}</time>
    {run.summary?.sessionNote && (
      <span
        className="session-note"
        data-testid="session-note"
        data-tip={copy.theAgentStarts}
      >
        {run.summary.sessionNote}
      </span>
    )}
  </div>
);

export { UserMessageMeta };
