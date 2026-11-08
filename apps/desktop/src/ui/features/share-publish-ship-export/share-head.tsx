import { Icon } from "@design-studio/ui";
import type { ReactElement, ReactNode } from "react";

import { copy } from "./copy.js";

interface ShareHeadProps {
  readonly title: string;
  readonly subtitle: string;
  readonly tabs: ReactNode;
  readonly onClose: () => void;
}

const ShareHead = ({
  onClose,
  subtitle,
  tabs,
  title,
}: ShareHeadProps): ReactElement => (
  <div className="modal-head">
    <div className="titles">
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </div>
    {tabs}
    <button
      type="button"
      className="icon-btn"
      aria-label={copy.close}
      onClick={onClose}
    >
      <Icon name="close" />
    </button>
  </div>
);

export { ShareHead };
