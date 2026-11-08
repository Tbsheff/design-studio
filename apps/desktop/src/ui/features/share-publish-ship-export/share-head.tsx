import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { ShareMode } from "./share-mode.js";
import { ShareTabs } from "./share-tabs.js";

interface ShareHeadProps {
  readonly title: string;
  readonly subtitle: string;
  readonly mode: ShareMode;
  readonly onMode: (mode: ShareMode) => void;
  readonly onClose: () => void;
}

const ShareHead = ({
  mode,
  onClose,
  onMode,
  subtitle,
  title,
}: ShareHeadProps): ReactElement => (
  <div className="modal-head">
    <div className="titles">
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </div>
    <ShareTabs mode={mode} onMode={onMode} />
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
