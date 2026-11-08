import type { ReactElement } from "react";

interface Props {
  readonly path: string;
}

const GLYPH_SIZE = 14;

const ToolGlyph = ({ path }: Props): ReactElement => (
  <svg
    width={GLYPH_SIZE}
    height={GLYPH_SIZE}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={path} />
  </svg>
);

export { ToolGlyph };
