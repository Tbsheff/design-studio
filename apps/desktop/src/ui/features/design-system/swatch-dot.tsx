import type { PackSummary } from "@design-studio/contracts";
import type { ReactElement } from "react";
import { useMemo } from "react";

const SwatchDot = ({
  swatch,
}: {
  swatch: PackSummary["swatches"][number];
}): ReactElement => {
  const style = useMemo(() => ({ background: swatch.value }), [swatch.value]);

  return <span className="swatch" style={style} data-tip={swatch.name} />;
};

export { SwatchDot };
