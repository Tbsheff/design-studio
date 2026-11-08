import type { ReactElement } from "react";

import { CheckLayoutList } from "./check-layout-list.js";
import { CheckProblemList } from "./check-problem-list.js";
import { CheckRowHead } from "./check-row-head.js";
import { CheckScreenshot } from "./check-screenshot.js";
import { toViewportLabel } from "./render-check-model.js";
import type { ShownResult } from "./render-check-model.js";

interface CheckRowProps {
  readonly projectId: string;
  readonly shown: ShownResult;
}

const CheckRow = ({ projectId, shown }: CheckRowProps): ReactElement => {
  const { layout, problems, result } = shown;

  return (
    <div className="check-row">
      <CheckRowHead shown={shown} />
      {layout.length > 0 && <CheckLayoutList layout={layout} />}
      {problems.length > 0 && <CheckProblemList problems={problems} />}
      {result.screenshotPath && (
        <CheckScreenshot
          projectId={projectId}
          filePath={result.screenshotPath}
          label={toViewportLabel(result.viewport)}
        />
      )}
    </div>
  );
};

export { CheckRow };
