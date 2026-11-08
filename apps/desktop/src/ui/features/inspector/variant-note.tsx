import type { ReactElement } from "react";

import { copy } from "./copy.js";

interface Props {
  readonly prefix: string;
  readonly note: string;
  readonly onBase: () => void;
}

const VariantNote = ({ prefix, note, onBase }: Props): ReactElement => (
  <output className="ins-variant-note">
    <code className="ins-variant-prefix">{prefix}</code>
    <span>{note}</span>
    <button
      type="button"
      className="ins-add-link ins-variant-base"
      onClick={onBase}
    >
      {copy.base}
    </button>
  </output>
);

export { VariantNote };
