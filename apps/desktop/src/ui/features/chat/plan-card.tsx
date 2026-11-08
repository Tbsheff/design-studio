import type { ReactElement } from "react";

import { focusPromptInput } from "./composer-focus.js";
import { copy } from "./copy.js";

const PlanCard = ({ onApprove }: { onApprove: () => void }): ReactElement => (
  <section
    className="plan-card"
    data-testid="plan-card"
    aria-label={copy.planReady}
  >
    <p>
      <strong>{copy.planReady2}</strong>
      {copy.noFilesChangedYet}
    </p>
    <div className="plan-actions">
      <button type="button" className="btn small primary" onClick={onApprove}>
        {copy.approveAndBuild}
      </button>
      <button type="button" className="btn small" onClick={focusPromptInput}>
        {copy.keepPlanning}
      </button>
    </div>
  </section>
);

export { PlanCard };
