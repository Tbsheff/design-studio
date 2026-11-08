import type { ReactElement } from "react";

import { CheckRow } from "./check-row.js";
import { copy } from "./copy.js";
import type { ShownResult } from "./render-check-model.js";

interface CheckPanelBodyProps {
  readonly projectId: string;
  readonly error: string | null;
  readonly hidden: number;
  readonly shown: readonly ShownResult[];
}

const CheckPanelBody = ({
  error,
  hidden,
  projectId,
  shown,
}: CheckPanelBodyProps): ReactElement => (
  <div className="check-body">
    {error && <div className="alert error">{error}</div>}
    {hidden > 0 && (
      <div className="muted small-text" data-tip={copy.findingsThePage}>
        {`${hidden}${copy.oldHidden}`}
      </div>
    )}
    {shown.map((entry) => (
      <CheckRow
        key={`${entry.result.viewport}-${entry.result.width}`}
        projectId={projectId}
        shown={entry}
      />
    ))}
  </div>
);

export { CheckPanelBody };
