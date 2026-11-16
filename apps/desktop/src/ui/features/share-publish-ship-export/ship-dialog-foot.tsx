import type { ShipPrepare } from "@design-studio/contracts/ship";
import type { ReactElement } from "react";

import { pick } from "../../platform/pick.js";
import { copy } from "./copy.js";
import { actionLabel, footNote } from "./ship-model.js";
import type { Draft } from "./ship-model.js";

interface ShipDialogFootProps {
  readonly plan: ShipPrepare | null;
  readonly draft: Draft | null;
  readonly count: number;
  readonly canSubmit: boolean;
  readonly isBusy: boolean;
  readonly onClose: () => void;
}

const toSubmitText = (draft: Draft | null, count: number): string => {
  const label = actionLabel(draft?.mode ?? "branch");
  const suffix = pick(count > 0, ` (${count})`, "");

  return `${label}${suffix}`;
};

const ShipDialogFoot = ({
  canSubmit,
  count,
  draft,
  isBusy,
  onClose,
  plan,
}: ShipDialogFootProps): ReactElement => (
  <div className="modal-foot">
    <span
      className="ship-foot-note"
      data-tip={`${plan?.format?.note ?? copy.gitHooksDoNotRun} ${copy.neverShip}`}
    >
      {footNote(plan)}
    </span>
    <span className="ship-spacer" />
    <button
      type="button"
      className="btn ghost"
      onClick={onClose}
      disabled={isBusy}
    >
      {copy.cancel}
    </button>
    <button
      type="submit"
      className="btn primary"
      disabled={!canSubmit || isBusy}
    >
      {pick(isBusy, copy.shipping, toSubmitText(draft, count))}
    </button>
  </div>
);

export { ShipDialogFoot };
