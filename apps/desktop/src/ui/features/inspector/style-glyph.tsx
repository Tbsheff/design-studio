import type { ReactElement } from "react";

import { copy } from "./copy.js";

type GlyphKind = "italic" | "strike" | "underline";

const StyleGlyph = ({ kind }: { readonly kind: GlyphKind }): ReactElement => {
  if (kind === "italic") {
    return <em>{copy.glyphItalic}</em>;
  }

  if (kind === "underline") {
    return <u>{copy.glyphUnderline}</u>;
  }

  return <s>{copy.glyphStrikethrough}</s>;
};

export { StyleGlyph };

export type { GlyphKind };
