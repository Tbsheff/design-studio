import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { formatTime } from "../../domain/format.js";
import { copy } from "./copy.js";

const RetryMarker = ({ startedAt }: { startedAt: number }): ReactElement => (
  <div
    className="msg-retry text-xs text-muted-foreground tabular-nums"
    data-testid="retry-marker"
  >
    <Icon name="undo" size={12} />
    {copy.retry}
    <time>{formatTime(startedAt)}</time>
  </div>
);

export { RetryMarker };
