import { Icon } from "@design-studio/ui";
import type { ReactElement, ReactNode } from "react";

import { copy } from "./copy.js";

const NoteBar = ({
  children,
  onClose,
}: {
  readonly children: ReactNode;
  readonly onClose: () => void;
}): ReactElement => (
  <output className="tk-note">
    <Icon name="magnet" size={13} />
    {children}
    <button
      type="button"
      className="icon-btn tk-note-close"
      aria-label={copy.dismiss}
      onClick={onClose}
    >
      <Icon name="close" size={12} />
    </button>
  </output>
);

export { NoteBar };
