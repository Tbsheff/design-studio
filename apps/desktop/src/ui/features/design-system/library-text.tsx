import type { PackSummary } from "@design-studio/contracts";
import type { ReactElement } from "react";
import { useMemo } from "react";

import { COPY } from "./copy.js";
import { LibraryModeSwatches } from "./library-mode-swatches.js";
import { SANS, SERIF } from "./library-model.js";
import { PackBadges } from "./pack-badges.js";
import { fontStack } from "./packs.js";

const LibraryText = ({ pack }: { pack: PackSummary }): ReactElement => {
  const displayStyle = useMemo(
    () => ({ fontFamily: fontStack(pack.fonts.display, SERIF) }),
    [pack]
  );

  const bodyStyle = useMemo(
    () => ({ fontFamily: fontStack(pack.fonts.body, SANS) }),
    [pack]
  );

  return (
    <span className="lib-text">
      <span className="lib-name truncate">{pack.name}</span>
      <span className="lib-fonts">
        <span style={displayStyle}>{pack.fonts.display}</span>
        <span aria-hidden="true"> {COPY.textGlyph3}</span>
        <span style={bodyStyle}>{pack.fonts.body}</span>
      </span>
      <LibraryModeSwatches pack={pack} />
      <PackBadges pack={pack} tags={2} />
    </span>
  );
};

export { LibraryText };
