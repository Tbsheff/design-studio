import type { ReactElement } from "react";

import { MOD_LABEL } from "./comment-popover.js";
import { copy } from "./copy.js";

const RunHint = ({ queueOnly }: { queueOnly: boolean }): ReactElement => (
  <p className="comment-card-hint" role="note" data-testid="comment-run-hint">
    <span className="comment-card-live" aria-hidden="true" />
    {copy.textClaudeIsWorking}
    <kbd>{copy.textGlyph}</kbd>
    {queueOnly && ` ${copy.textQueuesThisForAfter}`}
    {!queueOnly && ` ${copy.textQueuesThis}`}
    {!queueOnly && <kbd>{`${MOD_LABEL}${copy.textGlyph}`}</kbd>}
    {!queueOnly && ` ${copy.textSendsItNow}`}
  </p>
);

export { RunHint };
