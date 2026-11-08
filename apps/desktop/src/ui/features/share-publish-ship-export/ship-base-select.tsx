import type { ShipPrepare } from "@design-studio/contracts/ship";
import { UiSelect } from "@design-studio/ui";
import { useMemo } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

interface ShipBaseSelectProps {
  readonly plan: ShipPrepare;
  readonly onBase: (id: string) => void;
}

const ShipBaseSelect = ({
  onBase,
  plan,
}: ShipBaseSelectProps): ReactElement => {
  const bases = useMemo(
    () =>
      plan.bases.map((entry) => ({
        label: entry.title,
        value: entry.versionId,
      })),
    [plan.bases]
  );

  return (
    <div className="field ship-base">
      <span id={copy.shipBaseLabelId}>{copy.changesSince}</span>
      <UiSelect
        aria-labelledby={copy.shipBaseLabelId}
        value={plan.base?.versionId ?? ""}
        options={bases}
        onChange={onBase}
      />
    </div>
  );
};

export { ShipBaseSelect };
