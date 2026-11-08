import type { ToolDiff } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { DiffBadge } from "./diff-badge.js";
import { DiffView } from "./diff-view.js";

const ShellEditFile = ({ diff }: { diff: ToolDiff }): ReactElement => (
  <div className="flex min-w-0 flex-col gap-1">
    <span className="flex items-center gap-2 font-mono break-all text-foreground">
      {diff.path}
      <DiffBadge added={diff.added} removed={diff.removed} />
    </span>
    <DiffView diff={diff} />
  </div>
);

export { ShellEditFile };
