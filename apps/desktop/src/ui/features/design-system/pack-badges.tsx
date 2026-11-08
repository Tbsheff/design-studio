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

const PackBadges = ({
  pack,
  tags = 0,
}: {
  pack: PackSummary;
  tags?: number;
}): ReactElement => (
  <span className="lib-badges">
    <span className="badge">
      {pack.mode === "dark" && "Dark"}
      {pack.mode !== "dark" && "Light"}
    </span>
    {pack.source === "user" && <ProvenanceBadge pack={pack} />}
    {pack.source !== "user" && (
      <span className="badge">{COPY.titleBuiltIn}</span>
    )}
    {pack.draft && <span className="badge warn">{COPY.textDraft}</span>}
    {pack.tags.slice(0, tags).map((tag) => (
      <span key={tag} className="lib-tag">
        {tag}
      </span>
    ))}
  </span>
);

export { PackBadges };
