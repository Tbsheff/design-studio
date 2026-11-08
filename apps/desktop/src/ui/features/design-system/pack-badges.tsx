import type { PackSummary } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { COPY } from "./copy.js";
import { ProvenanceBadge } from "./pack-provenance-badge.js";

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
