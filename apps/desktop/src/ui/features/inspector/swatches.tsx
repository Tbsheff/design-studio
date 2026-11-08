import type { PackSummary } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { SwatchDot } from "./swatch-dot.js";

const DEFAULT_MAX = 6;

interface Props {
  readonly swatches: PackSummary["swatches"];
  readonly max?: number;
  readonly size?: "sm" | "md" | "lg";
}

const Swatches = ({
  swatches,
  max = DEFAULT_MAX,
  size = "md",
}: Props): ReactElement => (
  <span className={`swatches ${size}`} aria-hidden="true">
    {swatches.slice(0, max).map((swatch) => (
      <SwatchDot key={swatch.name} name={swatch.name} value={swatch.value} />
    ))}
  </span>
);

export { Swatches };
