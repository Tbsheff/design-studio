import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

interface Props {
  readonly file: string;
  readonly line: number;
  readonly onClose: () => void;
}

const CLOSE_ICON_SIZE = 12;

const CodeEditHead = ({ file, line, onClose }: Props): ReactElement => (
  <header className="variation-card-head">
    <div className="variation-card-heading">
      <h2 id="code-edit-title">{copy.codeEditTitle}</h2>
      <p className="code-edit-file">{`${file}:${String(line)}`}</p>
    </div>
    <button
      type="button"
      className="icon-btn small"
      aria-label={copy.close}
      onClick={onClose}
    >
      <Icon name="close" size={CLOSE_ICON_SIZE} />
    </button>
  </header>
);

export { CodeEditHead };
