import type { PackSummary } from "@design-studio/contracts";
import type { ReactElement } from "react";
import { useMemo } from "react";

import { COPY } from "./copy.js";
import { fontStack } from "./packs.js";

const SERIF = "Georgia, serif";
const SANS = "system-ui, sans-serif";

const toSwatchValue = (pack: PackSummary, name: string): string | null =>
  pack.swatches.find((swatch) => swatch.name === name)?.value ?? null;

const PackSpecimen = ({ pack }: { pack: PackSummary }): ReactElement => {
  const colors = useMemo(
    () => ({
      background: toSwatchValue(pack, "bg") ?? "",
      color: toSwatchValue(pack, "fg") ?? "",
    }),
    [pack]
  );

  const display = useMemo(
    () => ({ fontFamily: fontStack(pack.fonts.display, SERIF) }),
    [pack.fonts.display]
  );

  const body = useMemo(
    () => ({ fontFamily: fontStack(pack.fonts.body, SANS) }),
    [pack.fonts.body]
  );

  return (
    <span className="pack-specimen" style={colors} aria-hidden="true">
      <span className="pack-aa" style={display}>
        {COPY.textAa}
      </span>
      <span className="pack-line" style={body}>
        {COPY.textQuickBrownFox}
      </span>
    </span>
  );
};

export { PackSpecimen };
