import type { PackSummary } from "../../../shared/actions/_core/contracts.js";

interface Props {
  swatches: PackSummary["swatches"];
  max?: number;
  size?: "sm" | "md" | "lg";
}

export const Swatches = ({ swatches, max = 6, size = "md" }: Props) => (
  <span className={`swatches ${size}`} aria-hidden="true">
    {swatches.slice(0, max).map((swatch) => (
      <span
        key={swatch.name}
        className="swatch"
        style={{ background: swatch.value }}
        data-tip={swatch.name}
      />
    ))}
  </span>
);
