import { Icon } from "@design-studio/ui";
import type { ReactElement, ReactNode } from "react";

import { copy } from "./copy.js";

const ComposerAlert = ({
  children,
  onClose,
}: {
  readonly children: ReactNode;
  readonly onClose: () => void;
}): ReactElement => (
  <div className="alert error composer-alert" role="alert">
    <span className="composer-alert-text">{children}</span>
    <button
      type="button"
      className="icon-btn composer-alert-close"
      aria-label={copy.dismiss}
      onClick={onClose}
    >
      <Icon name="close" size={12} />
    </button>
  </div>
);

export { ComposerAlert };
