import type { PackSummary } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { DetailError } from "./detail-error.js";
import { PackActionBar } from "./pack-action-bar.js";
import type { PackDetailActions } from "./pack-detail-actions.js";
import type { PackDetailRun } from "./use-pack-detail-run.js";

const DetailBar = ({
  actions,
  pack,
  state,
}: {
  actions: PackDetailActions;
  pack: PackSummary;
  state: PackDetailRun;
}): ReactElement => (
  <div className="lib-detail-bar">
    <PackActionBar
      actions={actions}
      isBusy={state.isBusy}
      pack={pack}
      run={state.run}
    />
    <DetailError message={state.error} />
  </div>
);

export { DetailBar };
