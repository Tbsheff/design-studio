import type { PackSummary } from "@design-studio/contracts";
import type { ReactElement } from "react";
import { useCallback } from "react";

import { ActionIcon } from "./action-icon.js";
import { SPECS, toActionTone } from "./pack-action-model.js";
import type { PackActionKind } from "./pack-action-model.js";
import type { PackDetailActions } from "./pack-detail-actions.js";

const PackActionButton = ({
  actions,
  isBusy,
  kind,
  pack,
  run,
}: {
  actions: PackDetailActions;
  isBusy: boolean;
  kind: PackActionKind;
  pack: PackSummary;
  run: (task: () => Promise<void>) => void;
}): ReactElement => {
  const spec = SPECS[kind];

  const press = useCallback((): void => {
    if (!spec.isTask) {
      spec.run(actions, pack);

      return;
    }

    run(async () => {
      await spec.run(actions, pack);
    });
  }, [actions, pack, run, spec]);

  return (
    <button
      type="button"
      className={toActionTone(kind, actions)}
      disabled={isBusy}
      onClick={press}
    >
      <ActionIcon isShown={spec.hasIcon} />
      {spec.label}
    </button>
  );
};

export { PackActionButton };
