import type { PackSummary } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { COPY } from "./copy.js";
import { PackActionButton } from "./pack-action-button.js";
import { toActionKinds } from "./pack-action-model.js";
import type { PackDetailActions } from "./pack-detail-actions.js";

const PackActionBar = ({
  actions,
  isBusy,
  pack,
  run,
}: {
  actions: PackDetailActions;
  isBusy: boolean;
  pack: PackSummary;
  run: (task: () => Promise<void>) => void;
}): ReactElement => (
  <fieldset className="lib-actions" aria-label={COPY.labelActions}>
    {toActionKinds(pack, actions).map((kind) => (
      <PackActionButton
        key={kind}
        actions={actions}
        isBusy={isBusy}
        kind={kind}
        pack={pack}
        run={run}
      />
    ))}
  </fieldset>
);

export { PackActionBar };
