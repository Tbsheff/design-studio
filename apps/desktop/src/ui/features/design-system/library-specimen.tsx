import type { PackSummary } from "@design-studio/contracts";
import type { ReactElement } from "react";
import { useMemo } from "react";

import { COPY } from "./copy.js";
import { SERIF, toSwatchValue } from "./library-model.js";
import { fontStack } from "./packs.js";

const LibrarySpecimen = ({ pack }: { pack: PackSummary }): ReactElement => {
  const specimenStyle = useMemo(
    () => ({
      background: toSwatchValue(pack, "bg") ?? "",
      color: toSwatchValue(pack, "fg") ?? "",
    }),
    [pack]
  );

  const chipStyle = useMemo(
    () => ({ background: toSwatchValue(pack, "primary") ?? "" }),
    [pack]
  );

  const aaStyle = useMemo(
    () => ({ fontFamily: fontStack(pack.fonts.display, SERIF) }),
    [pack]
  );

  return (
    <span className="lib-specimen" style={specimenStyle} aria-hidden="true">
      <span className="lib-aa" style={aaStyle}>
        {COPY.textAa}
      </span>
      <span className="lib-chip" style={chipStyle} />
    </span>
  );
};

export { LibrarySpecimen };
