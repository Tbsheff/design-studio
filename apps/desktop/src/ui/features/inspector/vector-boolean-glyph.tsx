import type { ReactElement } from "react";

import type { BooleanOpName } from "../../../shared/vector.js";
import { BOOLEAN_GLYPH, GLYPH_OPACITY, toFillPaint } from "./vector-model.js";

const BooleanGlyph = ({ op }: { readonly op: BooleanOpName }): ReactElement => {
  const glyph = BOOLEAN_GLYPH[op];

  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      stroke="currentColor"
      strokeWidth="1.2"
      aria-hidden="true"
    >
      <path
        d={glyph.first}
        fill={toFillPaint(glyph.isFirstFilled)}
        fillOpacity={GLYPH_OPACITY}
      />
      <path
        d={glyph.second}
        fill={toFillPaint(glyph.isSecondFilled)}
        fillOpacity={glyph.secondOpacity}
      />
      {glyph.hasCut && (
        <path d="M6.5 6.5h3v3h-3z" fill="currentColor" stroke="none" />
      )}
      {glyph.hasOverlay && (
        <path d="M6.5 6.5h3v3h-3z" fill="var(--surface-raised)" stroke="none" />
      )}
    </svg>
  );
};

export { BooleanGlyph };
