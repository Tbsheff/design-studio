import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { ShareMode } from "./share-mode.js";
import { ShareTabButton } from "./share-tab-button.js";

interface ShareTabsProps {
  readonly mode: ShareMode;
  readonly onMode: (mode: ShareMode) => void;
}

const TABLIST_ROLE = "tablist";

const ShareTabs = ({ mode, onMode }: ShareTabsProps): ReactElement => (
  <div
    className="segmented share-tabs"
    role={TABLIST_ROLE}
    aria-label={copy.tabs}
  >
    <ShareTabButton
      id="link"
      label={copy.localLink}
      isSelected={mode === "link"}
      onMode={onMode}
    />
    <ShareTabButton
      id="publish"
      label={copy.publishTab}
      isSelected={mode === "publish"}
      onMode={onMode}
    />
  </div>
);

export { ShareTabs };
