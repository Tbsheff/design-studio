import type { RenderCheckResult } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { CheckPanelBody } from "./check-panel-body.js";
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
      <div className="check-head">
        <Icon name="scan" />
        <strong>{copy.renderCheck}</strong>
        <div className="spacer" />
        <button
          type="button"
          className="icon-btn"
          aria-label={copy.close}
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </div>
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
