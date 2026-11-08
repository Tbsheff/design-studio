import type { RenderCheckResult } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { CheckPanelBody } from "./check-panel-body.js";
import { CheckPanelHead } from "./check-panel-head.js";
import { copy } from "./copy.js";
import { hideOldFindings } from "./render-check-model.js";
import { useOldKeys } from "./use-old-keys.js";

interface Props {
  projectId: string;
  results: RenderCheckResult[] | null;
  error: string | null;
  onClose: () => void;
}

const REGION_ROLE = "region";

const RenderCheckPanel = ({
  error,
  onClose,
  projectId,
  results,
}: Props): ReactElement => {
  const { hidden, shown } = hideOldFindings(
    results,
    useOldKeys(projectId, results)
  );

  return (
    <div
      className="check-panel"
      role={REGION_ROLE}
      aria-label={copy.renderCheckResults}
    >
      <CheckPanelHead onClose={onClose} />
      <CheckPanelBody
        projectId={projectId}
        error={error}
        hidden={hidden}
        shown={shown}
      />
    </div>
  );
};

export { RenderCheckPanel };
