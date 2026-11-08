import type { ReactElement } from "react";

import { HealthDot } from "./deps.js";
import { Keys } from "./keys-view.js";
import { toRowNote } from "./palette-model.js";
import { typePair } from "./palette-row-builders.js";
import type { Row } from "./palette-row-types.js";

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

  return (
    <span className="cmdk-end">
      {note && <span className="cmdk-note">{note}</span>}
      {isPlain && hit?.health?.level === "failed" && <HealthDot hit={hit} />}
      {isPlain && hit && (
        <span className="cmdk-type">{typePair(hit.type)}</span>
      )}
      {isEnter && <Keys keys="Enter" extraClass="cmdk-keys" />}
      {!isEnter && row.keys && <Keys keys={row.keys} extraClass="cmdk-keys" />}
    </span>
  );
};

export { PaletteRowEnd };
