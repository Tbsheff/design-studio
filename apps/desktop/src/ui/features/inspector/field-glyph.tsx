import type { ReactElement } from "react";

type FieldGlyphKind = "leading" | "radius" | "tracking";

const GLYPH_PATHS: Readonly<Record<FieldGlyphKind, string>> = {
  leading: "M3 3h10M3 13h10M8 5.5v5M6.5 7 8 5.5 9.5 7M6.5 9 8 10.5 9.5 9",
  radius: "M3 13V8a5 5 0 0 1 5-5h5",
  tracking:
    "M2.5 3v10M13.5 3v10M5 8h6M6.5 6.5 5 8l1.5 1.5M9.5 6.5 11 8 9.5 9.5",
};

const FieldGlyph = ({
  kind,
  tip,
}: {
  readonly kind: FieldGlyphKind;
  readonly tip: string;
}): ReactElement => (
  <span className="ins-field-glyph" data-tip={tip}>
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={GLYPH_PATHS[kind]} />
    </svg>
  </span>
);

export { FieldGlyph };

export type { FieldGlyphKind };
