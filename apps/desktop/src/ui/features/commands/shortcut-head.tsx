import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { Icon } from "./deps.js";

const ShortcutHead = ({ onClose }: { onClose: () => void }): ReactElement => (
  <header className="keysheet-head">
    <h2>{copy.shortcuts}</h2>
    <button
      type="button"
      className="icon-btn small"
      aria-label={copy.closeShortcuts}
      onClick={onClose}
    >
      <Icon name="close" size={14} />
    </button>
  </header>
);

export { ShortcutHead };
