import type { PackSummary } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { COPY } from "./copy.js";

const PROVENANCE: Record<PackSummary["provenance"], string> = {
  extracted: "From sources",
  imported: "Imported",
  original: "Made here",
};

const ProvenanceBadge = ({ pack }: { pack: PackSummary }): ReactElement => {
  if (pack.copiedFrom && pack.provenance === "original") {
    return (
      <span className="badge accent" data-tip={`Copy of ${pack.copiedFrom}`}>
        {COPY.textCopy}
      </span>
    );
  }

  return <span className="badge accent">{PROVENANCE[pack.provenance]}</span>;
};

export { ProvenanceBadge };
