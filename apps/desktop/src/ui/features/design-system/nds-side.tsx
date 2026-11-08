import type { ReactElement } from "react";

import { COPY } from "./copy.js";
import { NdsActions } from "./nds-actions.js";
import { Basics } from "./nds-basics.js";
import { SourceSummary } from "./nds-source-summary.js";
import type { DraftForm, Patch } from "./new-design-system-values.js";

const NdsSide = ({
  form,
  set,
  error,
  isBusy,
  isReady,
  onCancel,
}: {
  form: DraftForm;
  set: (patch: Patch) => void;
  error: string | null;
  isBusy: boolean;
  isReady: boolean;
  onCancel: () => void;
}): ReactElement => (
  <aside className="nds-side" aria-label={COPY.labelCreate}>
    <div className="nds-side-card">
      <Basics form={form} set={set} />
      <SourceSummary form={form} />
      {error && (
        <div className="alert error small" role="alert">
          {error}
        </div>
      )}
      <NdsActions isBusy={isBusy} isReady={isReady} onCancel={onCancel} />
    </div>
  </aside>
);

export { NdsSide };
