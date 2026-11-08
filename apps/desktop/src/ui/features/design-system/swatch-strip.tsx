import type { PackSummary } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { SwatchDot } from "./swatch-dot.js";

const SwatchStrip = ({
  max,
  size,
  swatches,
}: {
  max: number;
  size: "sm" | "md" | "lg";
  swatches: PackSummary["swatches"];
}): ReactElement => (
  <span className={`swatches ${size}`} aria-hidden="true">
    {swatches.slice(0, max).map((swatch) => (
      <SwatchDot key={swatch.name} swatch={swatch} />
    ))}
  </span>
);

export { SwatchStrip };
