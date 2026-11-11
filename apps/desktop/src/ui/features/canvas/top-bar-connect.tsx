import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { openConnectAi } from "../../domain/connect-ai-events.js";
import { copy } from "./copy.js";

const TopBarConnect = (): ReactElement => (
  <button
    type="button"
    className="topbar-text-btn topbar-connect"
    data-tip={copy.connectAiTip}
    aria-label={copy.connectAi}
    data-testid="topbar-connect-ai"
    onClick={openConnectAi}
  >
    <Icon name="sparkle" size={14} />
    <span className="topbar-label">{copy.connectAi}</span>
  </button>
);

export { TopBarConnect };
