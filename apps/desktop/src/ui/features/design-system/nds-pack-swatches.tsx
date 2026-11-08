import type { PackSummary } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { Swatch } from "./nds-swatch.js";

const SWATCH_COUNT = 4;

const PackSwatches = ({ pack }: { pack: PackSummary }): ReactElement => (
  <span className="nds-preset-swatches" aria-hidden="true">
    {pack.swatches.slice(0, SWATCH_COUNT).map((swatch) => (
      <Swatch key={swatch.name} color={swatch.value} />
    ))}
  </span>
);

export { PackSwatches };
