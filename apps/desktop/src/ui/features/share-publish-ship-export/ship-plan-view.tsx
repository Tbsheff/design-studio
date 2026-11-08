import type { ShipPrepare } from "@design-studio/contracts/ship";
import type { ReactElement } from "react";

import { STATUS_ROLE } from "./aria-roles.js";
import { ShipBaseSelect } from "./ship-base-select.js";
import { ShipEmpty } from "./ship-empty.js";
import { ShipFields } from "./ship-fields.js";
import { ShipFileList } from "./ship-file-list.js";
import { conflictHint } from "./ship-model.js";
import type { Draft, Fields } from "./ship-model.js";

interface ShipPlanViewProps {
  readonly plan: ShipPrepare;
  readonly draft: Draft | null;
  readonly fields: Fields | null;
  readonly focus: string | null;
  readonly onFocus: (path: string) => void;
  readonly onToggle: (path: string) => void;
  readonly onBase: (id: string) => void;
  readonly onPatch: (next: Partial<Draft>) => void;
}

const ShipPlanView = ({
  draft,
  fields,
  focus,
  onBase,
  onFocus,
  onPatch,
  onToggle,
  plan,
}: ShipPlanViewProps): ReactElement => {
  if (plan.bases.length === 0) {
    return <ShipEmpty text={plan.blocked} />;
  }

  return (
    <>
      <ShipBaseSelect plan={plan} onBase={onBase} />
      {plan.blocked && (
        <div className="alert small" role={STATUS_ROLE}>
          {plan.blocked}
        </div>
      )}
      {plan.files.length > 0 && draft && (
        <ShipFileList
          plan={plan}
          draft={draft}
          focus={focus}
          onFocus={onFocus}
          onToggle={onToggle}
        />
      )}
      {plan.files.some((entry) => entry.conflict) && (
        <p className="ship-warn">{conflictHint(plan)}</p>
      )}
      {draft && fields && !plan.blocked && (
        <ShipFields
          plan={plan}
          draft={draft}
          fields={fields}
          onPatch={onPatch}
        />
      )}
    </>
  );
};

export { ShipPlanView };
