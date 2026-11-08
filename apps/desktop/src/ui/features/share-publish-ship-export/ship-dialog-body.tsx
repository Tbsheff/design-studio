import type { ShipPrepare } from "@design-studio/contracts/ship";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { Draft, Fields } from "./ship-model.js";
import { ShipPlanView } from "./ship-plan-view.js";

interface ShipDialogBodyProps {
  readonly plan: ShipPrepare | null;
  readonly draft: Draft | null;
  readonly fields: Fields | null;
  readonly focus: string | null;
  readonly shown: string | null;
  readonly onFocus: (path: string) => void;
  readonly onToggle: (path: string) => void;
  readonly onBase: (id: string) => void;
  readonly onPatch: (next: Partial<Draft>) => void;
}

const ShipDialogBody = ({
  draft,
  fields,
  focus,
  onBase,
  onFocus,
  onPatch,
  onToggle,
  plan,
  shown,
}: ShipDialogBodyProps): ReactElement => (
  <div className="modal-body ship-body">
    {!plan && !shown && <p className="muted">{copy.readingChanges}</p>}
    {plan && (
      <ShipPlanView
        plan={plan}
        draft={draft}
        fields={fields}
        focus={focus}
        onFocus={onFocus}
        onToggle={onToggle}
        onBase={onBase}
        onPatch={onPatch}
      />
    )}
    {shown && (
      <div className="alert error small" role="alert">
        {shown}
      </div>
    )}
  </div>
);

export { ShipDialogBody };
