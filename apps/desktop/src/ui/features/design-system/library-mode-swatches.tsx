import type { PackSummary } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { COPY } from "./copy.js";
import { SwatchStrip } from "./swatch-strip.js";

const toLightSwatches = (pack: PackSummary): PackSummary["swatches"] | null => {
  if (pack.mode === "light") {
    return pack.swatches;
  }

  return null;
};

const toDarkSwatches = (pack: PackSummary): PackSummary["swatches"] | null => {
  if (pack.mode === "dark") {
    return pack.swatches;
  }

  return pack.darkSwatches ?? null;
};

const LibraryModeSwatches = ({ pack }: { pack: PackSummary }): ReactElement => {
  const light = toLightSwatches(pack);
  const dark = toDarkSwatches(pack);

  return (
    <span className="lib-modes" data-testid="mode-swatches">
      {light && (
        <span className="lib-mode light" data-tip={COPY.tipLightModeColors}>
          <span className="sr-only">{COPY.textLight}</span>
          <SwatchStrip swatches={light} max={6} size="md" />
        </span>
      )}
      {dark && (
        <span className="lib-mode dark" data-tip={COPY.tipDarkModeColors}>
          <span className="sr-only">{COPY.textDark}</span>
          <SwatchStrip swatches={dark} max={6} size="md" />
        </span>
      )}
    </span>
  );
};

export { LibraryModeSwatches };
