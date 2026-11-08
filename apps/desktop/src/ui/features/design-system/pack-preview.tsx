import type { CompiledTokenEntry, PackSummary } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { toIsDual, toLightLabel, toModesClass } from "./preview-model.js";
import { PvDarkSurface } from "./pv-dark-surface.js";
import { PvSurface } from "./pv-surface.js";
import { PvTypeScale } from "./pv-type-scale.js";

const PackPreview = ({
  entries,
  pack,
}: {
  entries: CompiledTokenEntry[];
  pack: PackSummary;
}): ReactElement => {
  const isDual = toIsDual(pack, entries);

  return (
    <div className="pv">
      <div className={toModesClass(isDual)}>
        <PvSurface
          entries={entries}
          mode="light"
          label={toLightLabel(pack, isDual)}
          name={pack.name}
        />
        <PvDarkSurface entries={entries} isShown={isDual} name={pack.name} />
      </div>
      <PvTypeScale entries={entries} />
    </div>
  );
};

export { PackPreview };
