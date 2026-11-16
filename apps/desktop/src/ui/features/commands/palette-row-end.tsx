import type { ReactElement } from "react";

import { HealthDot, toKindBadge } from "./deps.js";
import type { ProjectHit } from "./deps.js";
import { Keys } from "./keys-view.js";
import { toRowNote } from "./palette-model.js";
import type { Row } from "./palette-row-types.js";

const toHitBadge = (hit: ProjectHit | null): string | null => {
  if (hit === null) {
    return null;
  }

  return toKindBadge(hit.type);
};

const PaletteRowEnd = ({
  row,
  isActive,
  isTyping,
}: {
  row: Row;
  isActive: boolean;
  isTyping: boolean;
}): ReactElement => {
  const isEnter = isTyping && isActive && !row.disabled;
  const note = toRowNote(row, isEnter);
  const isPlain = Boolean(row.hit) && row.kind === "project" && !row.icon;
  const hit = row.hit ?? null;
  const kindBadge = toHitBadge(hit);

  return (
    <span className="cmdk-end">
      {note && <span className="cmdk-note">{note}</span>}
      {isPlain && hit?.health?.level === "failed" && <HealthDot hit={hit} />}
      {isPlain && kindBadge !== null && (
        <span className="cmdk-type">{kindBadge}</span>
      )}
      {isEnter && <Keys keys="Enter" extraClass="cmdk-keys" />}
      {!isEnter && row.keys && <Keys keys={row.keys} extraClass="cmdk-keys" />}
    </span>
  );
};

export { PaletteRowEnd };
